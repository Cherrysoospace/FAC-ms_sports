import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { Fan } from './entities/fan.entity';
import type { FansRepository } from './repositories/fans.repository';
import { FanMapper } from './mappers/fan.mapper';
import { FansService } from './fans.service';

const makeFan = (overrides: Partial<Fan> = {}): Fan =>
  Object.assign(new Fan(), {
    id: 1,
    securityUserId: 50,
    fullName: 'Laura Martínez',
    documentNumber: '1004567890',
    email: 'laura@correo.com',
    phone: '3001234567',
    active: true,
    createdAt: new Date('2026-11-20T10:00:00.000Z'),
    ...overrides,
  });

describe('FansService', () => {
  let service: FansService;
  const fanRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (entity: Fan) =>
      Object.assign(entity, { id: entity.id ?? 1 }),
    ),
    remove: jest.fn(async () => undefined),
  };
  const fansRepository = {
    findByFilters: jest.fn(async () => [] as Fan[]),
    findBySecurityUserId: jest.fn(async () => null as Fan | null),
    findByDocumentNumber: jest.fn(async () => null as Fan | null),
    findByEmailIgnoringCase: jest.fn(async () => null as Fan | null),
    countFavoriteTeams: jest.fn(async () => 0),
    countPaymentMethods: jest.fn(async () => 0),
    countFavoriteTeamsByFanIds: jest.fn(async () => new Map<number, number>()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FansService(
      fanRepository as unknown as Repository<Fan>,
      fansRepository as unknown as FansRepository,
      new FanMapper(),
    );
  });

  describe('create', () => {
    it('registra un aficionado y devuelve el DTO con conteo de favoritos', async () => {
      const saved = makeFan({ id: 7 });
      fanRepository.findOne.mockResolvedValueOnce(saved);

      const result = await service.create({
        securityUserId: 50,
        fullName: 'Laura Martínez',
        documentNumber: '1004567890',
        email: 'laura@correo.com',
        phone: '3001234567',
      });

      expect(result).toMatchObject({
        id: 7,
        securityUserId: 50,
        fullName: 'Laura Martínez',
        favoriteTeamsCount: 0,
      });
    });

    it('rechaza con 409 cuando ya existe securityUserId, documento o correo', async () => {
      fansRepository.findBySecurityUserId.mockResolvedValueOnce(makeFan());
      await expect(
        service.create({
          securityUserId: 50,
          fullName: 'Otro',
          documentNumber: '99999',
          email: 'otro@correo.com',
        }),
      ).rejects.toThrow('asociado a este usuario');

      fansRepository.findByDocumentNumber.mockResolvedValueOnce(makeFan());
      await expect(
        service.create({
          securityUserId: 51,
          fullName: 'Otro',
          documentNumber: '1004567890',
          email: 'otro@correo.com',
        }),
      ).rejects.toThrow('documento 1004567890');

      fansRepository.findByEmailIgnoringCase.mockResolvedValueOnce(makeFan());
      await expect(
        service.create({
          securityUserId: 52,
          fullName: 'Otro',
          documentNumber: '222222',
          email: 'laura@correo.com',
        }),
      ).rejects.toThrow('correo laura@correo.com');
    });
  });

  describe('/me/fan', () => {
    it('autorregistra usando el correo del JWT cuando no viene en el cuerpo', async () => {
      const user: AuthenticatedUser = { id: 88, email: 'Mia@UC.edu.co ' };
      const saved = makeFan({
        id: 3,
        securityUserId: 88,
        fullName: 'Mía Rojas',
        email: 'mia@uc.edu.co',
      });
      fanRepository.findOne.mockResolvedValueOnce(saved);

      const result = await service.registerMyProfile(user, {
        fullName: 'Mía Rojas',
        documentNumber: '10203040',
      });

      expect(fanRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          securityUserId: 88,
          email: 'mia@uc.edu.co',
        }),
      );
      expect(result.email).toBe('mia@uc.edu.co');
    });

    it('rechaza autorregistro si ni el DTO ni el JWT tienen correo', async () => {
      const user: AuthenticatedUser = { id: 88, email: null };

      await expect(
        service.registerMyProfile(user, {
          fullName: 'Mía Rojas',
          documentNumber: '10203040',
        }),
      ).rejects.toThrow('correo electrónico es obligatorio');
      expect(fanRepository.save).not.toHaveBeenCalled();
    });

    it('actualiza datos personales del aficionado autenticado activo', async () => {
      const user: AuthenticatedUser = { id: 50, email: 'laura@correo.com' };
      const current = makeFan({ id: 1, securityUserId: 50 });
      const updated = makeFan({
        id: 1,
        securityUserId: 50,
        fullName: 'Laura M. Ruiz',
        phone: null,
      });
      fansRepository.findBySecurityUserId.mockResolvedValueOnce(current);
      fanRepository.findOne.mockResolvedValueOnce(updated);

      const result = await service.updateMyProfile(user, {
        fullName: 'Laura M. Ruiz',
        phone: null,
      });

      expect(result.fullName).toBe('Laura M. Ruiz');
      expect(result.phone).toBeNull();
    });
  });

  describe('remove', () => {
    it('bloquea con 409 cuando el aficionado tiene equipos favoritos', async () => {
      fanRepository.findOne.mockResolvedValueOnce(makeFan());
      fansRepository.countFavoriteTeams.mockResolvedValueOnce(2);

      await expect(service.remove(1)).rejects.toThrow('2 equipos favoritos');
      expect(fanRepository.remove).not.toHaveBeenCalled();
    });

    it('bloquea con 409 cuando el aficionado tiene métodos de pago asociados', async () => {
      fanRepository.findOne.mockResolvedValueOnce(makeFan());
      fansRepository.countFavoriteTeams.mockResolvedValueOnce(0);
      fansRepository.countPaymentMethods.mockResolvedValueOnce(1);

      await expect(service.remove(1)).rejects.toThrow('1 método de pago');
      expect(fanRepository.remove).not.toHaveBeenCalled();
    });

    it('elimina un aficionado sin asociaciones', async () => {
      const fan = makeFan({ id: 9 });
      fanRepository.findOne.mockResolvedValueOnce(fan);
      fansRepository.countFavoriteTeams.mockResolvedValueOnce(0);

      await expect(service.remove(9)).resolves.toEqual({
        message: 'Aficionado #9 eliminado correctamente',
      });
      expect(fanRepository.remove).toHaveBeenCalledWith(fan);
    });
  });
});
