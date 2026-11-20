import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { PermissionValidationClient } from './permission-validation.client';
import type { AuthenticatedRequest } from './authenticated-user';
import {
  extractBearerToken,
  permissionPath,
  readUserFromToken,
} from './request-credentials';

/**
 * Guard global (APP_GUARD): cada petición se valida en ms_security con la
 * ruta real (con el prefijo /gestion-deportiva) y el método.
 * Sin token → 401; token inválido → 401; sin permiso → 403; ms_security caído → 503.
 * Si pasa, deja el usuario del JWT en `request.user` (@CurrentUser()).
 */
@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionValidationClient: PermissionValidationClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Debes iniciar sesión para continuar');
    }

    const path = permissionPath(request.originalUrl);
    const allowed = await this.permissionValidationClient.isAllowed(
      token,
      path,
      request.method,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta operación',
      );
    }

    request.user = readUserFromToken(token) ?? undefined;
    return true;
  }
}
