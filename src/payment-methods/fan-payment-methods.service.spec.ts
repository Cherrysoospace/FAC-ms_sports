import type { Repository } from 'typeorm';
import type { IPaymentMethodValidator } from '../common/contracts';
import { Fan } from '../fans/entities/fan.entity';
import type { FansService } from '../fans/fans.service';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { PaymentMethod } from './entities/payment-method.entity';
import { FanPaymentMethod } from './entities/fan-payment-method.entity';
import { PaymentMethodType } from './enums/payment-method-type.enum';
import { PaymentMethodMapper } from './mappers/payment-method.mapper';
import { FanPaymentMethodMapper } from './mappers/fan-payment-method.mapper';
import type { PaymentMethodsRepository } from './repositories/payment-methods.repository';
import type { FanPaymentMethodsRepository } from './repositories/fan-payment-methods.repository';
import { PaymentMethodsService } from './payment-methods.service';
import { FanPaymentMethodsService } from './fan-payment-methods.service';
import { CardPaymentMethodValidator } from './validators/card-payment-method.validator';

const makeFan = (id = 1, active = true): Fan =>
  Object.assign(new Fan(), {
    id,
    securityUserId: id * 10,
    fullName: `Aficionado ${id}`,
    active,
  });

const makeCatalogMethod = (
  overrides: Partial<PaymentMethod> = {},
): PaymentMethod =>
  Object.assign(new PaymentMethod(), {
    id: 3,
    name: 'Tarjeta de crédito',
    type: PaymentMethodType.CARD,
    description: null,
    active: true,
    ...overrides,
  });

const makeFanMethod = (
  overrides: Partial<FanPaymentMethod> = {},
): FanPaymentMethod =>
  Object.assign(new FanPaymentMethod(), {
    id: 12,
    alias: 'Mi Visa',
    reference: '****4242',
    details: {
      cardHolder: 'Laura Martínez',
      brand: 'VISA',
      expirationMonth: 12,
      expirationYear: new Date().getFullYear() + 2,
    },
    active: true,
    createdAt: new Date('2026-11-20T15:00:00.000Z'),
    fan: makeFan(1),
    paymentMethod: makeCatalogMethod(),
    ...overrides,
  });

describe('Métodos de pago (PaymentMethodsService y FanPaymentMethodsService)', () => {
  const user: AuthenticatedUser = { id: 10, email: 'fan@correo.com' };

  describe('PaymentMethodsService', () => {
    let catalogService: PaymentMethodsService;
    const pmRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (pm: PaymentMethod) =>
        Object.assign(pm, { id: pm.id ?? 3 }),
      ),
      remove: jest.fn(async () => undefined),
    };
    const pmCustomRepo = {
      findByFilters: jest.fn(async () => [] as PaymentMethod[]),
      findByNameIgnoringCase: jest.fn(async () => null as PaymentMethod | null),
      countFanPaymentMethods: jest.fn(async () => 0),
      countFanPaymentMethodsByIds: jest.fn(
        async () => new Map<number, number>(),
      ),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      catalogService = new PaymentMethodsService(
        pmRepo as unknown as Repository<PaymentMethod>,
        pmCustomRepo as unknown as PaymentMethodsRepository,
        new PaymentMethodMapper(),
      );
    });

    it('bloquea con 409 eliminar un catálogo asociado a aficionados', async () => {
      pmRepo.findOne.mockResolvedValueOnce(makeCatalogMethod());
      pmCustomRepo.countFanPaymentMethods.mockResolvedValueOnce(3);

      await expect(catalogService.remove(3)).rejects.toThrow('3 aficionados');
      expect(pmRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('FanPaymentMethodsService', () => {
    let service: FanPaymentMethodsService;
    const fpmRepo = {
      save: jest.fn(async (entity: FanPaymentMethod) =>
        Object.assign(entity, { id: entity.id ?? 12 }),
      ),
      remove: jest.fn(async () => undefined),
    };
    const fpmCustomRepo = {
      findByFilters: jest.fn(async () => [] as FanPaymentMethod[]),
      findOneWithRelations: jest.fn(),
      findDuplicate: jest.fn(async () => null as FanPaymentMethod | null),
    };
    const fansService = {
      getFanBySecurityUserOrFail: jest.fn(async () => makeFan(1)),
      getActiveFanBySecurityUserOrFail: jest.fn(async () => makeFan(1)),
    };
    const paymentMethodsService = {
      getActivePaymentMethodOrFail: jest.fn(async () => makeCatalogMethod()),
    };
    const validators: readonly IPaymentMethodValidator[] = [
      new CardPaymentMethodValidator(),
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      service = new FanPaymentMethodsService(
        fpmRepo as unknown as Repository<FanPaymentMethod>,
        fpmCustomRepo as unknown as FanPaymentMethodsRepository,
        new FanPaymentMethodMapper(),
        fansService as unknown as FansService,
        paymentMethodsService as unknown as PaymentMethodsService,
        validators,
      );
    });

    it('registra método validando mediante la estrategia correspondiente', async () => {
      const hydrated = makeFanMethod();
      fpmCustomRepo.findOneWithRelations.mockResolvedValueOnce(hydrated);

      const result = await service.registerMine(user, {
        paymentMethodId: 3,
        alias: 'Mi Visa',
        reference: '****4242',
        details: hydrated.details,
      });

      expect(fpmRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        id: 12,
        alias: 'Mi Visa',
        fanId: 1,
        paymentMethod: { id: 3, type: PaymentMethodType.CARD },
      });
    });

    it('rechaza con 409 si la referencia ya está registrada para el mismo método', async () => {
      fpmCustomRepo.findDuplicate.mockResolvedValueOnce(makeFanMethod());

      await expect(
        service.registerMine(user, {
          paymentMethodId: 3,
          alias: 'Mi Visa',
          reference: '****4242',
          details: makeFanMethod().details,
        }),
      ).rejects.toThrow('Ya tienes registrado este método de pago');
      expect(fpmRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza con 403 si otro aficionado intenta consultar, editar, eliminar o usar el método', async () => {
      const otherFansMethod = makeFanMethod({ fan: makeFan(99) });
      fpmCustomRepo.findOneWithRelations.mockResolvedValue(otherFansMethod);

      await expect(service.findOneMine(user, 12)).rejects.toThrow(
        'otro aficionado',
      );
      await expect(
        service.updateMine(user, 12, { alias: 'Robada' }),
      ).rejects.toThrow('otro aficionado');
      await expect(service.removeMine(user, 12)).rejects.toThrow(
        'otro aficionado',
      );
      await expect(service.getOwnedActiveMethodOrFail(1, 12)).rejects.toThrow(
        'otro aficionado',
      );
    });

    it('valida estado activo del método propio y del catálogo en getOwnedActiveMethodOrFail', async () => {
      fpmCustomRepo.findOneWithRelations.mockResolvedValueOnce(
        makeFanMethod({ active: false }),
      );
      await expect(service.getOwnedActiveMethodOrFail(1, 12)).rejects.toThrow(
        'está inactivo',
      );

      fpmCustomRepo.findOneWithRelations.mockResolvedValueOnce(
        makeFanMethod({
          active: true,
          paymentMethod: makeCatalogMethod({ active: false }),
        }),
      );
      await expect(service.getOwnedActiveMethodOrFail(1, 12)).rejects.toThrow(
        'deshabilitado',
      );
    });
  });
});
