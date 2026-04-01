import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — equivalent to [Authorize] in .NET
 * Apply to any endpoint that requires a valid JWT access token.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@Req() req) { return req.user; }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('Access token is missing or invalid.');
    }
    return user;
  }
}
