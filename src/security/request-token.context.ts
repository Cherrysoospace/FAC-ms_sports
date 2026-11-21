import { AsyncLocalStorage } from 'node:async_hooks';

const requestTokenStorage = new AsyncLocalStorage<string>();

/**
 * Ejecuta `fn` asociando el Bearer token de la petición actual en contexto asíncrono,
 * para propagarlo a llamadas internas como `POST /api/internal/notifications/email`
 * sin modificar las firmas de los servicios ni notifiers de negocio.
 */
export function runWithRequestToken<T>(token: string, fn: () => T): T {
  return requestTokenStorage.run(token, fn);
}

/** Devuelve el Bearer token de la petición HTTP activa, o `null` si no existe. */
export function getCurrentRequestToken(): string | null {
  return requestTokenStorage.getStore() ?? null;
}
