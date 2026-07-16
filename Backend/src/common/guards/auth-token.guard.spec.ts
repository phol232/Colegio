import { AuthTokenGuard } from './auth-token.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('AuthTokenGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const authRepo = {
    validateToken: jest.fn(),
  };

  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    authTokenKey: jest.fn((t: string) => `auth:token:${t}`),
  };

  const config = {
    get: jest.fn().mockReturnValue(60),
  };

  const makeContext = (authHeader?: string) => {
    const request: Record<string, unknown> = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      request,
    } as unknown as ExecutionContext & { request: Record<string, unknown> };
  };

  let guard: AuthTokenGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthTokenGuard(
      reflector,
      authRepo as never,
      cache as never,
      config as never,
    );
  });

  it('permite rutas públicas', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rechaza sin Bearer token', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('valida token vía repositorio y adjunta usuario', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    cache.get.mockResolvedValue(null);
    authRepo.validateToken.mockResolvedValue({
      usuarioId: 7,
      email: 'a@test.com',
      name: 'Ana',
      role: 'estudiante',
      token: 'abc123',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    const ctx = makeContext('Bearer abc123') as ExecutionContext & {
      request: Record<string, unknown>;
    };
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authRepo.validateToken).toHaveBeenCalledWith('abc123');
    expect((ctx as any).switchToHttp().getRequest().user).toMatchObject({
      usuario_id: 7,
      role: 'estudiante',
    });
    expect(cache.set).toHaveBeenCalled();
  });
});
