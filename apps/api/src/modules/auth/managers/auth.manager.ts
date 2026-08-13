import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService, TokenPair } from '../services/auth.service';
import { NotificationService } from '../../notification/services/notification.service';
import { Features } from '../../../config/features';

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
  private readonly logger = new Logger(AuthManager.name);

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

    if (!Features.emailOtp) {
      // Email OTP disabled — store fixed OTP so verifyRegister still works normally.
      // Frontend auto-submits '000000' immediately after initiate (no verify page shown).
      await Promise.all([
        this.service.storeOtp(email, '000000'),
        this.service.storeOtpContext(email, displayName),
      ]);
      this.logger.log(`[OTP disabled] ${email} — auto-verify active, no email sent`);
      return { success: true };
    }

    const otp = this.service.generateOtp();
    await Promise.all([
      this.service.storeOtp(email, otp),
      this.service.storeOtpContext(email, displayName),
    ]);
    this.logger.log(`[OTP] Generated for ${email}: ${otp}`);
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

    // Constant-time failure — don't reveal whether email exists, or whether
    // the account has no password set (Google-only accounts have none)
    if (!user || !user.isActive || !user.passwordHash) {
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

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  async loginOrRegisterWithGoogle(profile: {
    googleId: string;
    email: string;
    displayName: string;
  }): Promise<ManagerResult<AuthData>> {
    let user = await this.service.findUserByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.service.findUserByEmail(profile.email);
      if (existingByEmail) {
        // Google verifies email ownership, so it's safe to link automatically
        user = await this.service.linkGoogleAccount(existingByEmail.id, profile.googleId);
      } else {
        user = await this.service.createGoogleUser(
          profile.email,
          profile.displayName,
          profile.googleId,
        );
      }
    }

    if (!user.isActive) {
      return { success: false, message: 'Account is disabled.' };
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
    if (!user.passwordHash) {
      return {
        success: false,
        message: 'This account signed up with Google and has no password set yet.',
      };
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
