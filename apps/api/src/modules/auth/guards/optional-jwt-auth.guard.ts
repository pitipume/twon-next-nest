import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard — like JwtAuthGuard, but never rejects the request.
 * Populates req.user when a valid bearer token is present, leaves it
 * undefined otherwise — for endpoints that must stay guest-accessible but
 * still want to know who's asking (e.g. catalog gating by role).
 *
 * Usage:
 *   @UseGuards(OptionalJwtAuthGuard)
 *   @Get('products')
 *   list(@CurrentUser() user?: { id: string; role: string }) { ... }
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || undefined;
  }
}
