/** Correo ya armado: destinatarios únicos y no vacíos (los filtra NotificationsService). */
export interface MailMessage {
  to: string[];
  subject: string;
  text: string;
}

/**
 * Cómo sale un correo. NotificationsService depende de esta abstracción, no
 * de la implementación: MAIL_MODE=console (simulado) o MAIL_MODE=smtp (nodemailer).
 */
export abstract class MailTransport {
  abstract send(message: MailMessage): Promise<void>;
}
