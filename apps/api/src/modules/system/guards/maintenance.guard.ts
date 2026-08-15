import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { MaintenanceService } from '../services/maintenance.service';

// Always reachable regardless of maintenance state — the auth bootstrap
// surface (so ADMIN can always log back in / restore a session / turn
// maintenance off) plus the status check itself.
const EXEMPT_PATHS = new Set([
  '/api/health',
  '/api/system/maintenance-status',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/admin/maintenance-config', // already RolesGuard(ADMIN)-protected on its own
]);

/**
 * MaintenanceGuard — the first app-wide guard in this codebase, registered
 * as APP_GUARD in AppModule. When maintenance is off, this is a no-op on
 * every request. When on, only ADMIN (and the exempt paths above) get
 * through; everyone else gets 503.
 *
 * Runs before any per-controller guard, so it can't rely on JwtAuthGuard
 * having already populated req.user — it decodes the bearer token itself.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly maintenance: MaintenanceService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (EXEMPT_PATHS.has(request.path)) return true;

    const { enabled, backByAt } = await this.maintenance.getConfig();
    if (!enabled) return true;

    if (this.isAdminRequest(request)) return true;

    throw new ServiceUnavailableException({
      message: 'Site is under maintenance.',
      maintenance: true,
      backByAt,
    });
  }

  private isAdminRequest(request: any): boolean {
    const authHeader = request.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) return false;

    try {
      const payload = this.jwt.verify(authHeader.slice(7), {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      return payload?.role === UserRole.ADMIN;
    } catch {
      return false;
    }
  }
}
