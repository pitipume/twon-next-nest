import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * RolesGuard — equivalent to a role-based IAuthorizationFilter in .NET
 * Always pair with JwtAuthGuard first.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 *   @Post('upload')
 *   upload() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Access denied.');

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) throw new ForbiddenException('You do not have permission to perform this action.');

    return true;
  }
}
