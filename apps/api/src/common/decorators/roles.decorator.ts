import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../modules/auth/guards/roles.guard';

/**
 * @Roles decorator — attach required roles to a route
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 *   @Post('upload')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
