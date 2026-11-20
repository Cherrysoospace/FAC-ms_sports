import { Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from './mail-transport';
import { NotificationsService } from './notifications.service';

class FakeTransport extends MailTransport {
  sent: MailMessage[] = [];
  fail = false;

  send(message: MailMessage): Promise<void> {
    if (this.fail) return Promise.reject(new Error('SMTP caído'));
    this.sent.push(message);
    return Promise.resolve();
  }
}

describe('NotificationsService', () => {
  let transport: FakeTransport;
  let service: NotificationsService;

  beforeEach(() => {
    transport = new FakeTransport();
    service = new NotificationsService(transport);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('quita destinatarios repetidos y vacíos', async () => {
    const count = await service.notify({
      to: ['Ana@uc.edu.co', 'ana@uc.edu.co ', '', 'luis@uc.edu.co'],
      subject: 'Nuevo partido',
      body: 'Hola',
    });
    expect(count).toBe(2);
    expect(transport.sent[0].to).toEqual(['ana@uc.edu.co', 'luis@uc.edu.co']);
  });

  it('sin destinatarios no envía nada', async () => {
    expect(await service.notify({ to: [], subject: 'x', body: 'y' })).toBe(0);
    expect(transport.sent).toHaveLength(0);
  });

  it('si el envío falla no lanza error (la operación continúa)', async () => {
    transport.fail = true;
    await expect(
      service.notify({ to: ['a@b.co'], subject: 'x', body: 'y' }),
    ).resolves.toBe(0);
  });
});
