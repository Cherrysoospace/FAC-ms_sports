import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityGuard } from './security.guard';
import { PermissionValidationClient } from './permission-validation.client';
import type { AuthenticatedRequest } from './authenticated-user';

const TOKEN = `h.${Buffer.from(JSON.stringify({ sub: '3', email: 'admin@uc.edu.co' })).toString('base64url')}.f`;

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SecurityGuard', () => {
  let isAllowed: jest.Mock;
  let isPublic: boolean;
  let guard: SecurityGuard;

  beforeEach(() => {
    isPublic = false;
    isAllowed = jest.fn();
    const reflector = {
      getAllAndOverride: () => isPublic,
    } as unknown as Reflector;
    guard = new SecurityGuard(reflector, {
      isAllowed,
    } as unknown as PermissionValidationClient);
  });

  const request = (
    authorization?: string,
    originalUrl = '/gestion-deportiva/teams/5?x=1',
  ) =>
    ({
      headers: { authorization },
      originalUrl,
      method: 'DELETE',
    }) as unknown as AuthenticatedRequest;

  it('deja pasar las rutas públicas sin consultar ms_security', async () => {
    isPublic = true;
    await expect(guard.canActivate(contextFor(request()))).resolves.toBe(true);
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it('sin token responde 401', async () => {
    await expect(
      guard.canActivate(contextFor(request())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('valida la ruta real sin query y deja el usuario en la petición', async () => {
    isAllowed.mockResolvedValue(true);
    const req = request(`Bearer ${TOKEN}`);
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(isAllowed).toHaveBeenCalledWith(
      TOKEN,
      '/gestion-deportiva/teams/5',
      'DELETE',
    );
    expect(req.user).toEqual({ id: 3, email: 'admin@uc.edu.co' });
  });

  it('sin permiso responde 403', async () => {
    isAllowed.mockResolvedValue(false);
    await expect(
      guard.canActivate(contextFor(request(`Bearer ${TOKEN}`))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propaga el 401 y el 503 del cliente de ms_security', async () => {
    isAllowed.mockRejectedValueOnce(new UnauthorizedException());
    await expect(
      guard.canActivate(contextFor(request(`Bearer ${TOKEN}`))),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    isAllowed.mockRejectedValueOnce(new ServiceUnavailableException());
    await expect(
      guard.canActivate(contextFor(request(`Bearer ${TOKEN}`))),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
