import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthRepository } from '../repositories/auth.repository';
import { RedisService } from '../../../infrastructure/redis/redis.service';

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_MAX_ATTEMPTS = 3;
const OTP_ATTEMPT_TTL_SECONDS = 900; // 15 minutes lockout window
const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── User ──────────────────────────────────────────────────────────────────

  async findUserByEmail(email: string) {
    return this.repository.findUserByEmail(email);
  }

  async findUserById(id: string) {
    return this.repository.findUserById(id);
  }

  async createUser(email: string, displayName: string, password: string) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return this.repository.createUser({ email, displayName, passwordHash });
  }

  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }

  // ─── OTP ───────────────────────────────────────────────────────────────────

  generateOtp(): string {
    // 6-digit cryptographically random OTP
    return String(crypto.randomInt(100000, 999999));
  }

  async storeOtp(email: string, otp: string): Promise<void> {
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    await this.redis.set(`otp:${email}`, hash, OTP_TTL_SECONDS);
    // store displayName temporarily so we don't ask again on verify
  }

  async storeOtpContext(email: string, displayName: string): Promise<void> {
    await this.redis.set(`otp_ctx:${email}`, displayName, OTP_TTL_SECONDS);
  }

  async getOtpContext(email: string): Promise<string | null> {
    return this.redis.get(`otp_ctx:${email}`);
  }

  async verifyOtp(email: string, otp: string): Promise<{ valid: boolean; message?: string }> {
    // Check attempt count
    const attemptKey = `otp_attempts:${email}`;
    const attempts = await this.redis.get(attemptKey);
    if (attempts && parseInt(attempts) >= OTP_MAX_ATTEMPTS) {
      return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    const storedHash = await this.redis.get(`otp:${email}`);
    if (!storedHash) {
      return { valid: false, message: 'OTP expired or not found. Please request a new one.' };
    }

    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (inputHash !== storedHash) {
      await this.redis.incr(attemptKey, OTP_ATTEMPT_TTL_SECONDS);
      return { valid: false, message: 'Incorrect OTP.' };
    }

    // Valid — clean up
    await this.redis.del(`otp:${email}`);
    await this.redis.del(attemptKey);
    return { valid: true };
  }

  // ─── Tokens ────────────────────────────────────────────────────────────────

  async generateTokenPair(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    // Raw refresh token — stored as hash in DB
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.repository.createRefreshToken({ userId: user.id, tokenHash, expiresAt });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async verifyRefreshToken(rawToken: string): Promise<User | null> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.repository.findRefreshToken(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      return null;
    }

    // Rotate — revoke old, issue new (handled in manager)
    return this.repository.findUserById(stored.userId);
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.repository.findRefreshToken(tokenHash);
    if (stored) {
      await this.repository.revokeRefreshToken(stored.id);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.repository.revokeAllUserRefreshTokens(userId);
  }
}
