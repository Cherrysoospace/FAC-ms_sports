import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailTransport } from './mail-transport';
import { NotificationsService } from './notifications.service';
import { ConsoleMailTransport } from './transports/console-mail.transport';
import { SmtpMailTransport } from './transports/smtp-mail.transport';

/**
 * Elige el transporte según MAIL_MODE (como app.mail.mode en ms_security):
 * 'smtp' = envío real con nodemailer; cualquier otro valor = consola (simulado).
 */
function mailTransportFactory(config: ConfigService): MailTransport {
  if (config.get<string>('MAIL_MODE') !== 'smtp') {
    return new ConsoleMailTransport();
  }
  const username = config.getOrThrow<string>('MAIL_USERNAME');
  new Logger(NotificationsModule.name).log('Correos por SMTP (MAIL_MODE=smtp)');
  return new SmtpMailTransport({
    host: config.get<string>('MAIL_HOST') ?? 'smtp.gmail.com',
    port: Number(config.get<string>('MAIL_PORT') ?? 587),
    username,
    password: config.getOrThrow<string>('MAIL_PASSWORD'),
    from: config.get<string>('MAIL_FROM') || username,
  });
}

@Module({
  providers: [
    {
      provide: MailTransport,
      useFactory: mailTransportFactory,
      inject: [ConfigService],
    },
    NotificationsService,
  ],
  // Lo usan Partido (al crear un partido) y los módulos de Fercho.
  exports: [NotificationsService],
})
export class NotificationsModule {}
