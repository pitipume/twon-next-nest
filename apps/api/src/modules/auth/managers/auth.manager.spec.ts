import { AuthManager } from './auth.manager';

const makeService = (overrides = {}) => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  findUserByGoogleId: jest.fn(),
  createGoogleUser: jest.fn(),
  linkGoogleAccount: jest.fn(),
  verifyPassword: jest.fn(),
  updateUserPassword: jest.fn(),
  generateTokenPair: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
  ...overrides,
});

const makeNotification = () => ({
  sendOtpEmail: jest.fn(),
  sendForgotPasswordEmail: jest.fn(),
});

function buildManager(serviceOverrides = {}) {
  const service = makeService(serviceOverrides) as any;
  const notification = makeNotification() as any;
  return { manager: new AuthManager(service, notification), service };
}

const user = (overrides = {}) => ({
  id: 'user-1',
  email: 'user@gmail.com',
  displayName: 'User',
  passwordHash: 'hashed',
  googleId: null,
  role: 'CUSTOMER',
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── loginOrRegisterWithGoogle ─────────────────────────────────────────────

describe('AuthManager.loginOrRegisterWithGoogle', () => {
  const profile = { googleId: 'google-123', email: 'user@gmail.com', displayName: 'User' };

  it('creates a new account when no user matches by googleId or email', async () => {
    const { manager, service } = buildManager({
      findUserByGoogleId: jest.fn().mockResolvedValue(null),
      findUserByEmail: jest.fn().mockResolvedValue(null),
      createGoogleUser: jest.fn().mockResolvedValue(user({ googleId: 'google-123' })),
    });

    const result = await manager.loginOrRegisterWithGoogle(profile);

    expect(service.createGoogleUser).toHaveBeenCalledWith('user@gmail.com', 'User', 'google-123');
    expect(service.linkGoogleAccount).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data?.accessToken).toBe('access');
  });

  it('auto-links to an existing password account matched by email', async () => {
    const existing = user({ id: 'existing-1', googleId: null });
    const { manager, service } = buildManager({
      findUserByGoogleId: jest.fn().mockResolvedValue(null),
      findUserByEmail: jest.fn().mockResolvedValue(existing),
      linkGoogleAccount: jest.fn().mockResolvedValue(user({ id: 'existing-1', googleId: 'google-123' })),
    });

    const result = await manager.loginOrRegisterWithGoogle(profile);

    expect(service.linkGoogleAccount).toHaveBeenCalledWith('existing-1', 'google-123');
    expect(service.createGoogleUser).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('logs straight in when a user already has this googleId', async () => {
    const { manager, service } = buildManager({
      findUserByGoogleId: jest.fn().mockResolvedValue(user({ googleId: 'google-123' })),
    });

    const result = await manager.loginOrRegisterWithGoogle(profile);

    expect(service.createGoogleUser).not.toHaveBeenCalled();
    expect(service.linkGoogleAccount).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('rejects a disabled account without issuing tokens', async () => {
    const { manager, service } = buildManager({
      findUserByGoogleId: jest.fn().mockResolvedValue(user({ googleId: 'google-123', isActive: false })),
    });

    const result = await manager.loginOrRegisterWithGoogle(profile);

    expect(result.success).toBe(false);
    expect(service.generateTokenPair).not.toHaveBeenCalled();
  });
});

// ─── login() — null passwordHash guard ─────────────────────────────────────

describe('AuthManager.login — Google-only accounts', () => {
  it('fails without calling verifyPassword when the account has no password set', async () => {
    const { manager, service } = buildManager({
      findUserByEmail: jest.fn().mockResolvedValue(user({ passwordHash: null })),
    });

    const result = await manager.login('user@gmail.com', 'anything');

    expect(result.success).toBe(false);
    expect(service.verifyPassword).not.toHaveBeenCalled();
  });
});

// ─── changePassword() — null passwordHash guard ────────────────────────────

describe('AuthManager.changePassword — Google-only accounts', () => {
  it('fails with a clear message and does not call verifyPassword', async () => {
    const { manager, service } = buildManager({
      findUserById: jest.fn().mockResolvedValue(user({ passwordHash: null })),
    });

    const result = await manager.changePassword('user-1', 'current', 'newpass');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Google/);
    expect(service.verifyPassword).not.toHaveBeenCalled();
  });
});
