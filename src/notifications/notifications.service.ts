import { Injectable, Logger } from '@nestjs/common';
import { MailTransport } from './mail-transport';

export interface Notification {
  // Correos de los destinatarios (se quitan repetidos y vacíos)
  to: string[];
  subject: string;
  body: string;
}

/**
 * Notificaciones por correo (partidos, anotaciones, apuestas...). Lo usan
 * Partido y los módulos de Fercho. Nunca interrumpe la operación que lo
 * llama: si el envío falla, se registra en el log y se continúa.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly transport: MailTransport) {}

  /** Devuelve cuántos destinatarios recibieron el correo (0 si no había o falló). */
  async notify(notification: Notification): Promise<number> {
    const recipients = [
      ...new Set(
        notification.to
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (recipients.length === 0) return 0;

    try {
      await this.transport.send({
        to: recipients,
        subject: notification.subject,
        text: notification.body,
      });
      return recipients.length;
    } catch (cause) {
      this.logger.error(
        `No se pudo enviar "${notification.subject}" a ${recipients.length} destinatario(s)`,
        cause instanceof Error ? cause.stack : String(cause),
      );
      return 0;
    }
  }
}
