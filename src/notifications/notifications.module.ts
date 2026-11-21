import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailTransport } from './mail-transport';
import { NotificationsService } from './notifications.service';
import { ConsoleMailTransport } from './transports/console-mail.transport';
import { SecurityMailTransport } from './transports/security-mail.transport';
import { SmtpMailTransport } from './transports/smtp-mail.transport';

/**
 * Elige el transporte según MAIL_MODE:
 * - 'security' = delega a ms_security (POST /api/internal/notifications/email);
 * - 'smtp' = envío real directo con nodemailer;
 * - cualquier otro valor = consola (simulado).
 */
export function mailTransportFactory(config: ConfigService): MailTransport {
  const mode = (config.get<string>('MAIL_MODE') ?? 'console')
    .trim()
    .toLowerCase();

  if (mode === 'security') {
    const baseUrl =
      config.get<string>('SECURITY_SERVICE_URL')?.trim() ||
      config.get<string>('MS_SECURITY')?.trim();
    if (!baseUrl) {
      throw new Error(
        'MAIL_MODE=security requiere definir SECURITY_SERVICE_URL o MS_SECURITY',
      );
    }

    const rawTimeout = config.get<string>('MAIL_TIMEOUT_MS');
    const parsedTimeout = rawTimeout !== undefined ? Number(rawTimeout) : NaN;
    const timeoutMs =
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : undefined;

    new Logger(NotificationsModule.name).log(
      `Correos delegados a ms_security (MAIL_MODE=security -> ${baseUrl.replace(/\/+$/, '')})`,
    );
    return new SecurityMailTransport({ baseUrl, timeoutMs });
  }

  if (mode !== 'smtp') {
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
