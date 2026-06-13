import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService, TokenPair } from '../services/auth.service';
import { NotificationService } from '../../notification/services/notification.service';

interface ManagerResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

interface AuthData {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'displayName' | 'role'>;
}

@Injectable()
export class AuthManager {
  constructor(
    private readonly service: AuthService,
    private readonly notification: NotificationService,
  ) {}

  // ─── Register: Step 1 — send OTP ───────────────────────────────────────────

  async initiateRegister(
    email: string,
    displayName: string,
  ): Promise<ManagerResult> {
    const existingUser = await this.service.findUserByEmail(email);
    if (existingUser?.isEmailVerified) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const otp = this.service.generateOtp();
    await Promise.all([
      this.service.storeOtp(email, otp),
      this.service.storeOtpContext(email, displayName),
    ]);

    await this.notification.sendOtpEmail(email, displayName, otp);

    return { success: true };
  }

  // ─── Register: Step 2 — verify OTP + create account ───────────────────────

  async verifyRegister(
    email: string,
    otp: string,
    password: string,
  ): Promise<ManagerResult<AuthData>> {
    // Check if already verified before touching OTP
    const existingUser = await this.service.findUserByEmail(email);
    if (existingUser?.isEmailVerified) {
      return { success: false, message: 'ALREADY_VERIFIED' };
    }

    const otpResult = await this.service.verifyOtp(email, otp);
    if (!otpResult.valid) {
      return { success: false, message: otpResult.message };
    }

    // Retrieve displayName from Redis context stored during step 1
    const displayName = await this.service.getOtpContext(email);
    if (!displayName) {
      return {
        success: false,
        message: 'Registration session expired. Please start again.',
      };
    }

    // Delete unverified account so createUser can proceed cleanly
    if (existingUser && !existingUser.isEmailVerified) {
      await this.service.deleteUser(existingUser.id);
    }

    const user = await this.service.createUser(email, displayName, password);
    const tokens = await this.service.generateTokenPair(user);

    return {
      success: true,
      data: this.buildAuthData(user, tokens),
    };
  }

  // ─── Forgot password: Step 1 — send OTP ──────────────────────────────────

  async forgotPassword(email: string): Promise<ManagerResult> {
    const user = await this.service.findUserByEmail(email);
    // Always return success — don't reveal whether email exists (security)
    if (!user || !user.isActive) return { success: true };

    const otp = this.service.generateOtp();
    await this.service.storeOtp(email, otp);
    await this.notification.sendForgotPasswordEmail(email, otp);

    return { success: true };
  }

  // ─── Forgot password: Step 2 — verify OTP + set new password ─────────────

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<ManagerResult> {
    const otpResult = await this.service.verifyOtp(email, otp);
    if (!otpResult.valid) {
      return { success: false, message: otpResult.message };
    }

    const user = await this.service.findUserByEmail(email);
    if (!user || !user.isActive) {
      return { success: false, message: 'Account not found.' };
    }

    await this.service.updateUserPassword(user.id, newPassword);
    // Revoke all existing sessions so old tokens can't be reused
    await this.service.revokeAllUserTokens(user.id);

    return { success: true };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<ManagerResult<AuthData>> {
    const user = await this.service.findUserByEmail(email);

    // Constant-time failure — don't reveal whether email exists
    if (!user || !user.isActive) {
      return { success: false };
    }

    const passwordValid = await this.service.verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return { success: false };
    }

    const tokens = await this.service.generateTokenPair(user);
    return {
      success: true,
      data: this.buildAuthData(user, tokens),
    };
  }

  // ─── Refresh token ────────────────────────────────────────────────────────

  async refreshToken(
    rawRefreshToken: string,
  ): Promise<{ success: boolean; accessToken?: string; refreshToken?: string }> {
    const user = await this.service.verifyRefreshToken(rawRefreshToken);
    if (!user) {
      return { success: false };
    }

    // Rotate: revoke old token, issue new pair
    await this.service.revokeRefreshToken(rawRefreshToken);
    const tokens = await this.service.generateTokenPair(user);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    await this.service.revokeRefreshToken(rawRefreshToken);
    // Note: access token expires naturally (15min) — no server-side revocation needed
  }

  // ─── Update display name ──────────────────────────────────────────────────

  async updateProfile(userId: string, displayName: string): Promise<ManagerResult<{ displayName: string }>> {
    await this.service.updateDisplayName(userId, displayName);
    return { success: true, data: { displayName } };
  }

  // ─── Change password (logged-in user) ─────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ManagerResult> {
    const user = await this.service.findUserById(userId);
    if (!user || !user.isActive) {
      return { success: false, message: 'Account not found.' };
    }

    const valid = await this.service.verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    await this.service.updateUserPassword(userId, newPassword);
    return { success: true };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private buildAuthData(user: User, tokens: TokenPair): AuthData {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }
}
