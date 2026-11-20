import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { MailMessage, MailTransport } from '../mail-transport';

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
}

/**
 * MAIL_MODE=smtp: envío real con nodemailer (Gmail, Outlook, Mailtrap...).
 * Mismas variables que ms_security: MAIL_HOST, MAIL_PORT, MAIL_USERNAME,
 * MAIL_PASSWORD y MAIL_FROM. Los destinatarios van en copia oculta para no
 * exponer los correos de los aficionados entre sí.
 */
@Injectable()
export class SmtpMailTransport extends MailTransport {
  private readonly transporter: Transporter;

  constructor(private readonly settings: SmtpSettings) {
    super();
    this.transporter = createTransport({
      host: settings.host,
      port: settings.port,
      // 465 = TLS directo; 587 = STARTTLS
      secure: settings.port === 465,
      auth: { user: settings.username, pass: settings.password },
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.settings.from,
      to: this.settings.from,
      bcc: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
