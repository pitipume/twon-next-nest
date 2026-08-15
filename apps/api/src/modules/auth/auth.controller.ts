import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { InitiateRegisterDto } from './dto/initiate-register.dto';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { LoginDto } from './dto/login.dto';
import { InitiateRegisterCommand } from './commands/initiate-register/initiate-register.command';
import { VerifyRegisterCommand } from './commands/verify-register/verify-register.command';
import { LoginCommand } from './commands/login/login.command';
import { RefreshTokenCommand } from './commands/refresh-token/refresh-token.command';
import { LogoutCommand } from './commands/logout/logout.command';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfile } from './guards/google.strategy';
import { GoogleAuthCommand } from './commands/google-auth/google-auth.command';
import { ForgotPasswordCommand } from './commands/forgot-password/forgot-password.command';
import { ResetPasswordCommand } from './commands/reset-password/reset-password.command';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileCommand } from './commands/update-profile/update-profile.command';
import { ChangePasswordCommand } from './commands/change-password/change-password.command';
import { AuthService } from './services/auth.service';
import { ApiResponse } from '../../common/response/api-response';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,        // not accessible via JS — XSS protection
  secure: isProd,
  // 'none' required for cross-site cookie (vercel → render); 'lax' for localhost
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('register/initiate')
  initiateRegister(@Body() dto: InitiateRegisterDto) {
    return this.commandBus.execute(
      new InitiateRegisterCommand(dto.email, dto.displayName),
    );
  }

  @Post('register/verify')
  async verifyRegister(
    @Body() dto: VerifyRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new VerifyRegisterCommand(dto.email, dto.otp, dto.password),
    );

    if (result.code === 'A001' && result.data?.refreshToken) {
      this.setRefreshCookie(res, result.data.refreshToken);
      // Don't expose raw refresh token in response body
      const { refreshToken: _, ...safeData } = result.data;
      return { ...result, data: safeData };
    }

    return result;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LoginCommand(dto.email, dto.password),
    );

    if (result.code === 'A001' && result.data?.refreshToken) {
      this.setRefreshCookie(res, result.data.refreshToken);
      const { refreshToken: _, ...safeData } = result.data;
      return { ...result, data: safeData };
    }

    return result;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await this.commandBus.execute(new RefreshTokenCommand(token ?? ''));

    if (result.code === 'A001' && result.data?.refreshToken) {
      this.setRefreshCookie(res, result.data.refreshToken);
    }

    return result;
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? '';
    const userId = (req as any).user?.id ?? '';

    const result = await this.commandBus.execute(new LogoutCommand(userId, token));

    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
    return result;
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // GoogleAuthGuard redirects to Google's consent screen — never reaches here
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as unknown as GoogleProfile;
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    const result = await this.commandBus.execute(
      new GoogleAuthCommand(profile.googleId, profile.email, profile.displayName),
    );

    if (result.code !== 'A001' || !result.data?.refreshToken) {
      return res.redirect(`${frontendUrl}/auth/login?error=google_auth_failed`);
    }

    this.setRefreshCookie(res, result.data.refreshToken);
    return res.redirect(
      `${frontendUrl}/auth/google/callback?accessToken=${encodeURIComponent(result.data.accessToken)}`,
    );
  }

  // The JWT payload only carries id/email/role (kept small on purpose) — this
  // endpoint is the one place a full profile is expected, so it looks the
  // user up rather than just echoing token claims back (which used to leave
  // displayName undefined for any caller relying on /auth/me, e.g. the
  // Google OAuth callback page).
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req as any).user.id;
    const user = await this.authService.findUserById(userId);
    if (!user) return ApiResponse.notFound('User not found.');
    return ApiResponse.success({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.commandBus.execute(new ForgotPasswordCommand(dto.email));
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.commandBus.execute(
      new ResetPasswordCommand(dto.email, dto.otp, dto.newPassword),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.commandBus.execute(new UpdateProfileCommand(userId, dto.displayName));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile/password')
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.commandBus.execute(
      new ChangePasswordCommand(userId, dto.currentPassword, dto.newPassword),
    );
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, COOKIE_OPTIONS);
  }
}
