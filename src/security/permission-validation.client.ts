import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Tiempo máximo de espera a ms_security antes de responder 503
const TIMEOUT_MS = 5000;

/**
 * Cliente HTTP de ms_security: POST /api/internal/security/permissions-validation
 * con el JWT del usuario. Traduce su respuesta:
 * - 200 { allowed }        → allowed
 * - 401                    → UnauthorizedException (token ausente, inválido o vencido)
 * - caído, timeout o 5xx   → ServiceUnavailableException (503)
 */
@Injectable()
export class PermissionValidationClient {
  private readonly logger = new Logger(PermissionValidationClient.name);
  private readonly endpoint: string;

  constructor(config: ConfigService) {
    const base = config.getOrThrow<string>('MS_SECURITY').replace(/\/+$/, '');
    this.endpoint = `${base}/api/internal/security/permissions-validation`;
  }

  async isAllowed(
    token: string,
    url: string,
    method: string,
  ): Promise<boolean> {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, method }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      this.logger.error(
        `ms_security no responde (${this.endpoint})`,
        cause instanceof Error ? cause.message : String(cause),
      );
      throw new ServiceUnavailableException(
        'El servicio de seguridad no está disponible. Intenta de nuevo más tarde',
      );
    }

    if (response.status === 401) {
      throw new UnauthorizedException(
        'Tu sesión no es válida o expiró. Inicia sesión nuevamente',
      );
    }
    if (!response.ok) {
      this.logger.error(
        `ms_security respondió ${response.status} al validar ${method} ${url}`,
      );
      throw new ServiceUnavailableException(
        'El servicio de seguridad no pudo validar el permiso. Intenta de nuevo más tarde',
      );
    }

    const body = (await response.json()) as { allowed?: unknown };
    return body.allowed === true;
  }
}
