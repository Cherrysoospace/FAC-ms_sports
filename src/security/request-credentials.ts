import type { AuthenticatedUser } from './authenticated-user';

/** Token del encabezado `Authorization: Bearer <token>`; null si falta o no es Bearer. */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.trim().split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Ruta que se envía a ms_security: con el prefijo global, sin query string ni
 * '/' final. ms_security convierte los ids en {id} (PermissionMatcher) y los
 * permisos se registran sin query, así que `/teams?search=x` debe ir como `/teams`.
 */
export function permissionPath(originalUrl: string): string {
  const path = originalUrl.split('?')[0].split('#')[0];
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Lee `sub` y `email` del JWT. No verifica la firma: se llama solo después de
 * que ms_security validó el token en permissions-validation.
 */
export function readUserFromToken(token: string): AuthenticatedUser | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { sub?: string; email?: string };
    const id = Number(claims.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id, email: claims.email ?? null };
  } catch {
    return null;
  }
}
