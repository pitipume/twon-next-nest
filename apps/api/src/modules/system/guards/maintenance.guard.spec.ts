import { ServiceUnavailableException } from '@nestjs/common';
import { MaintenanceGuard } from './maintenance.guard';

const makeContext = (path: string, authHeader?: string) => ({
  switchToHttp: () => ({
    getRequest: () => ({ path, headers: authHeader ? { authorization: authHeader } : {} }),
  }),
});

function buildGuard(configOverrides: { enabled: boolean; backByAt?: Date | null }, verifyImpl?: (token: string) => any) {
  const maintenance = { getConfig: jest.fn().mockResolvedValue({ backByAt: null, ...configOverrides }) } as any;
  const jwt = { verify: jest.fn(verifyImpl ?? (() => { throw new Error('invalid'); })) } as any;
  const config = { getOrThrow: jest.fn().mockReturnValue('secret') } as any;
  return new MaintenanceGuard(maintenance, jwt, config);
}

describe('MaintenanceGuard', () => {
  it('always allows exempt paths, even when maintenance is enabled', async () => {
    const guard = buildGuard({ enabled: true });
    await expect(guard.canActivate(makeContext('/api/auth/login') as any)).resolves.toBe(true);
    await expect(guard.canActivate(makeContext('/api/system/maintenance-status') as any)).resolves.toBe(true);
  });

  it('allows everything when maintenance is off', async () => {
    const guard = buildGuard({ enabled: false });
    await expect(guard.canActivate(makeContext('/api/catalog') as any)).resolves.toBe(true);
  });

  it('rejects a request with no token when maintenance is on', async () => {
    const guard = buildGuard({ enabled: true });
    await expect(guard.canActivate(makeContext('/api/catalog') as any)).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects a non-ADMIN token when maintenance is on', async () => {
    const guard = buildGuard({ enabled: true }, () => ({ role: 'CUSTOMER' }));
    await expect(
      guard.canActivate(makeContext('/api/catalog', 'Bearer sometoken') as any),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('allows an ADMIN token through when maintenance is on', async () => {
    const guard = buildGuard({ enabled: true }, () => ({ role: 'ADMIN' }));
    await expect(
      guard.canActivate(makeContext('/api/catalog', 'Bearer sometoken') as any),
    ).resolves.toBe(true);
  });

  it('treats an invalid/expired token as non-admin, not a crash', async () => {
    const guard = buildGuard({ enabled: true }, () => {
      throw new Error('jwt expired');
    });
    await expect(
      guard.canActivate(makeContext('/api/catalog', 'Bearer garbage') as any),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
