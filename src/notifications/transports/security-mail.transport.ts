import { Injectable, Logger } from '@nestjs/common';
import { getCurrentRequestToken } from '../../security/request-token.context';
import { MailMessage, MailTransport } from '../mail-transport';

const DEFAULT_TIMEOUT_MS = 5000;

export interface SecurityMailSettings {
  baseUrl: string;
  timeoutMs?: number;
  getToken?: () => string | null;
}

/**
 * MAIL_MODE=security: delega el envío de correos a ms_security mediante
 * POST /api/internal/notifications/email para reutilizar su MailService.
 */
@Injectable()
export class SecurityMailTransport extends MailTransport {
  private readonly logger = new Logger(SecurityMailTransport.name);
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly getToken: () => string | null;

  constructor(settings: SecurityMailSettings) {
    super();
    const base = settings.baseUrl.replace(/\/+$/, '');
    this.endpoint = `${base}/api/internal/notifications/email`;
    this.timeoutMs = settings.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.getToken = settings.getToken ?? getCurrentRequestToken;
  }

  async send(message: MailMessage): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken()?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      this.logger.warn(
        `Enviando correo delegado a ${this.endpoint} sin token Bearer en contexto`,
      );
    }

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: message.to,
          subject: message.subject,
          body: message.text,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      throw new Error(
        `No se pudo contactar ms_security en ${this.endpoint}: ${detail}`,
        { cause },
      );
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const suffix = errorBody ? `: ${errorBody}` : '';
      throw new Error(
        `ms_security respondió ${response.status} al enviar correo en ${this.endpoint}${suffix}`,
      );
    }
  }
}
