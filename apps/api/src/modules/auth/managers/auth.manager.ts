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
    if (existingUser) {
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

    // Guard against race condition — check email again before creating
    const existingUser = await this.service.findUserByEmail(email);
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const user = await this.service.createUser(email, displayName, password);
    const tokens = await this.service.generateTokenPair(user);

    return {
      success: true,
      data: this.buildAuthData(user, tokens),
    };
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
