import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../authenticated-user';

/**
 * Usuario autenticado que dejó el SecurityGuard en la petición.
 * Uso: `me(@CurrentUser() user: AuthenticatedUser)` (rutas /me/...).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      // Solo pasa si se usa en una ruta @Public(): es un error de programación
      throw new UnauthorizedException('Debes iniciar sesión');
    }
    return request.user;
  },
);
