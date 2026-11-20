import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from '../mail-transport';

// MAIL_MODE=console (por defecto): el correo se muestra en el log, no se envía.
@Injectable()
export class ConsoleMailTransport extends MailTransport {
  private readonly logger = new Logger('Correo (simulado)');

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      `Para: ${message.to.join(', ')}\nAsunto: ${message.subject}\n${message.text}`,
    );
    return Promise.resolve();
  }
}
