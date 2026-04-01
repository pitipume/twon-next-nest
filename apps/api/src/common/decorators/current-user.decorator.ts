import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — extracts req.user set by JwtAuthGuard
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: { id: string; email: string; role: string }) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
