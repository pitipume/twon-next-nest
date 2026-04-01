import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import { InitiateRegisterDto } from './dto/initiate-register.dto';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { LoginDto } from './dto/login.dto';
import { InitiateRegisterCommand } from './commands/initiate-register/initiate-register.command';
import { VerifyRegisterCommand } from './commands/verify-register/verify-register.command';
import { LoginCommand } from './commands/login/login.command';
import { RefreshTokenCommand } from './commands/refresh-token/refresh-token.command';
import { LogoutCommand } from './commands/logout/logout.command';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,        // not accessible via JS — XSS protection
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

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

    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return result;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, COOKIE_OPTIONS);
  }
}
