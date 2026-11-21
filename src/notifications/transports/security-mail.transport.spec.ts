import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { runWithRequestToken } from '../../security/request-token.context';
import { mailTransportFactory } from '../notifications.module';
import { NotificationsService } from '../notifications.service';
import { ConsoleMailTransport } from './console-mail.transport';
import { SecurityMailTransport } from './security-mail.transport';
import { SmtpMailTransport } from './smtp-mail.transport';

describe('SecurityMailTransport', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('envía POST a /api/internal/notifications/email con token, JSON y signal', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: () => Promise.resolve(''),
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const transport = new SecurityMailTransport({
      baseUrl: 'http://localhost:8181/',
      timeoutMs: 2500,
    });

    await runWithRequestToken('jwt-test', () =>
      transport.send({
        to: ['ana@uc.edu.co', 'luis@uc.edu.co'],
        subject: 'Nuevo partido',
        text: 'Contenido del partido',
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8181/api/internal/notifications/email');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-test',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      to: ['ana@uc.edu.co', 'luis@uc.edu.co'],
      subject: 'Nuevo partido',
      body: 'Contenido del partido',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sin token en contexto envía sin Authorization y registra warning', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: () => Promise.resolve(''),
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const transport = new SecurityMailTransport({
      baseUrl: 'http://localhost:8181',
    });

    await transport.send({
      to: ['ana@uc.edu.co'],
      subject: 'Aviso',
      text: 'Sin token',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('lanza Error cuando ms_security responde estado no-2xx', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const transport = new SecurityMailTransport({
      baseUrl: 'http://localhost:8181',
      getToken: () => 'jwt-invalido',
    });

    await expect(
      transport.send({
        to: ['ana@uc.edu.co'],
        subject: 'Aviso',
        text: 'Hola',
      }),
    ).rejects.toThrow(/401/);
  });

  it('lanza Error cuando hay fallo de red o timeout', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const transport = new SecurityMailTransport({
      baseUrl: 'http://localhost:8181',
      getToken: () => 'jwt-test',
    });

    await expect(
      transport.send({
        to: ['ana@uc.edu.co'],
        subject: 'Aviso',
        text: 'Hola',
      }),
    ).rejects.toThrow(/No se pudo contactar ms_security/);
  });

  it('NotificationsService captura el error del transporte y retorna 0', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const transport = new SecurityMailTransport({
      baseUrl: 'http://localhost:8181',
      getToken: () => 'jwt-test',
    });
    const service = new NotificationsService(transport);

    await expect(
      service.notify({
        to: ['ana@uc.edu.co'],
        subject: 'Aviso',
        body: 'Hola',
      }),
    ).resolves.toBe(0);
  });
});

describe('mailTransportFactory', () => {
  function configWith(values: Record<string, string | undefined>): ConfigService {
    return {
      get: <T = string>(key: string) => values[key] as T | undefined,
      getOrThrow: <T = string>(key: string) => {
        const value = values[key];
        if (value === undefined) {
          throw new Error(`Missing config key ${key}`);
        }
        return value as T;
      },
    } as unknown as ConfigService;
  }

  it('MAIL_MODE=security con SECURITY_SERVICE_URL crea SecurityMailTransport', () => {
    const transport = mailTransportFactory(
      configWith({
        MAIL_MODE: 'security',
        SECURITY_SERVICE_URL: 'http://security:8181',
        MAIL_TIMEOUT_MS: '3000',
      }),
    );
    expect(transport).toBeInstanceOf(SecurityMailTransport);
  });

  it('MAIL_MODE=security usa MS_SECURITY como fallback', () => {
    const transport = mailTransportFactory(
      configWith({
        MAIL_MODE: 'security',
        MS_SECURITY: 'http://localhost:8181',
      }),
    );
    expect(transport).toBeInstanceOf(SecurityMailTransport);
  });

  it('MAIL_MODE=security sin URL lanza Error', () => {
    expect(() =>
      mailTransportFactory(configWith({ MAIL_MODE: 'security' })),
    ).toThrow(/SECURITY_SERVICE_URL/);
  });

  it('MAIL_MODE=console o ausente crea ConsoleMailTransport', () => {
    expect(mailTransportFactory(configWith({}))).toBeInstanceOf(
      ConsoleMailTransport,
    );
    expect(
      mailTransportFactory(configWith({ MAIL_MODE: 'console' })),
    ).toBeInstanceOf(ConsoleMailTransport);
  });

  it('MAIL_MODE=smtp crea SmtpMailTransport', () => {
    const transport = mailTransportFactory(
      configWith({
        MAIL_MODE: 'smtp',
        MAIL_USERNAME: 'bot@uc.edu.co',
        MAIL_PASSWORD: 'secret',
      }),
    );
    expect(transport).toBeInstanceOf(SmtpMailTransport);
  });
});
