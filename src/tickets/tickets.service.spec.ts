import type { DataSource, EntityManager, Repository } from 'typeorm';
import { BusinessRuleException } from '../common/exceptions';
import { Fan } from '../fans/entities/fan.entity';
import type { FansService } from '../fans/fans.service';
import { Location } from '../locations/entities/location.entity';
import type { LocationsService } from '../locations/locations.service';
import type { LocationsRepository } from '../locations/repositories/locations.repository';
import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import type { MatchesService } from '../matches/matches.service';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import { Ticket } from './entities/ticket.entity';
import { TicketMapper } from './mappers/ticket.mapper';
import type { TicketsRepository } from './repositories/tickets.repository';
import { TicketsService } from './tickets.service';

function createMatch(
  overrides: Partial<{
    id: number;
    status: MatchStatus;
    tournamentStatus: TournamentStatus;
    venueId: number;
  }> = {},
): Match {
  const phase = Object.assign(new GroupPhase(), {
    id: 4,
    name: 'Grupos',
    groupName: 'A',
    tournament: {
      id: 1,
      name: 'Copa Universitaria',
      status: overrides.tournamentStatus ?? TournamentStatus.IN_PROGRESS,
    },
  });

  return {
    id: overrides.id ?? 10,
    scheduledAt: new Date('2026-11-25T19:00:00.000Z'),
    status: overrides.status ?? MatchStatus.SCHEDULED,
    phase,
    homeTeam: { id: 1, name: 'Leones' },
    awayTeam: { id: 2, name: 'Tigres' },
    venue: {
      id: overrides.venueId ?? 3,
      name: 'Estadio Central',
    },
  } as unknown as Match;
}

function createLocation(
  overrides: Partial<{
    id: number;
    name: string;
    capacity: number;
    active: boolean;
    venueId: number;
  }> = {},
): Location {
  return {
    id: overrides.id ?? 7,
    name: overrides.name ?? 'Tribuna Norte',
    capacity: overrides.capacity ?? 100,
    active: overrides.active ?? true,
    venue: {
      id: overrides.venueId ?? 3,
      name: 'Estadio Central',
    },
  } as unknown as Location;
}

function createFan(overrides: Partial<Fan> = {}): Fan {
  return Object.assign(new Fan(), {
    id: 5,
    securityUserId: 77,
    fullName: 'Sofía Castro',
    documentNumber: '1009988776',
    email: 'sofia@correo.com',
    phone: '3001112233',
    active: true,
    ...overrides,
  });
}

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return Object.assign(new Ticket(), {
    id: 90,
    code: 'TKT-M10-L7-ABCDEF12',
    price: '45000.00',
    purchasedAt: new Date('2026-11-21T02:00:00.000Z'),
    match: createMatch(),
    location: createLocation(),
    fan: createFan(),
    ...overrides,
  });
}

describe('TicketsService', () => {
  let service: TicketsService;
  const user: AuthenticatedUser = { id: 77, email: 'sofia@correo.com' };

  const ticketRepository = {
    remove: jest.fn(async () => undefined),
  };
  const ticketsRepository = {
    findByFilters: jest.fn(async () => [] as Ticket[]),
    findOneWithRelations: jest.fn(async () => null as Ticket | null),
    findByMatchAndFan: jest.fn(async () => null as Ticket | null),
    countByMatchGroupedByLocation: jest.fn(
      async () => new Map<number, number>(),
    ),
    countByMatchAndLocation: jest.fn(async () => 0),
  };
  const matchesService = {
    getMatchOrFail: jest.fn(),
  };
  const locationsService = {
    getLocationOrFail: jest.fn(),
  };
  const locationsRepository = {
    findByFilters: jest.fn(async () => [] as Location[]),
  };
  const fansService = {
    getActiveFanOrFail: jest.fn(),
    getFanBySecurityUserOrFail: jest.fn(),
    getActiveFanBySecurityUserOrFail: jest.fn(),
  };

  let txManager: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    txManager = {
      findOne: jest.fn(),
      save: jest.fn(async (_entity: unknown, target: Ticket) =>
        Object.assign(target, { id: 90 }),
      ),
    };
    dataSource = {
      transaction: jest.fn(
        async (callback: (manager: EntityManager) => Promise<number>) =>
          callback(txManager as unknown as EntityManager),
      ),
    };

    service = new TicketsService(
      ticketRepository as unknown as Repository<Ticket>,
      ticketsRepository as unknown as TicketsRepository,
      new TicketMapper(),
      matchesService as unknown as MatchesService,
      locationsService as unknown as LocationsService,
      locationsRepository as unknown as LocationsRepository,
      fansService as unknown as FansService,
      dataSource as unknown as DataSource,
    );
  });

  describe('getAvailability', () => {
    it('calcula aforo disponible por localidad en una sola consulta agrupada sin N+1', async () => {
      matchesService.getMatchOrFail.mockResolvedValueOnce(createMatch());
      locationsRepository.findByFilters.mockResolvedValueOnce([
        createLocation({ id: 7, name: 'Norte', capacity: 100 }),
        createLocation({ id: 8, name: 'VIP', capacity: 20 }),
      ]);
      ticketsRepository.countByMatchGroupedByLocation.mockResolvedValueOnce(
        new Map<number, number>([
          [7, 35],
          [8, 20],
        ]),
      );

      const availability = await service.getAvailability({ matchId: 10 });

      expect(locationsRepository.findByFilters).toHaveBeenCalledWith({
        venueId: 3,
        active: true,
      });
      expect(availability).toMatchObject({
        matchId: 10,
        venueId: 3,
        totalCapacity: 120,
        totalSold: 55,
        totalAvailable: 65,
      });
      expect(availability.locations).toEqual([
        {
          locationId: 7,
          locationName: 'Norte',
          active: true,
          capacity: 100,
          sold: 35,
          available: 65,
          soldOut: false,
        },
        {
          locationId: 8,
          locationName: 'VIP',
          active: true,
          capacity: 20,
          sold: 20,
          available: 0,
          soldOut: true,
        },
      ]);
    });
  });

  describe('purchaseMine', () => {
    it('emite boleto usando transacción y bloqueo pesimista sobre la localidad', async () => {
      const fan = createFan();
      const match = createMatch();
      const location = createLocation({ capacity: 50 });
      const hydrated = createTicket({ price: '35000.00' });

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      locationsService.getLocationOrFail.mockResolvedValueOnce(location);
      txManager.findOne
        .mockResolvedValueOnce(location)
        .mockResolvedValueOnce(match);
      ticketsRepository.findByMatchAndFan.mockResolvedValueOnce(null);
      ticketsRepository.countByMatchAndLocation.mockResolvedValueOnce(12);
      ticketsRepository.findOneWithRelations.mockResolvedValueOnce(hydrated);

      const result = await service.purchaseMine(user, {
        matchId: 10,
        locationId: 7,
        price: 35000,
      });

      expect(txManager.findOne).toHaveBeenNthCalledWith(1, Location, {
        where: { id: 7 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(txManager.findOne).toHaveBeenNthCalledWith(2, Match, {
        where: { id: 10 },
      });
      expect(ticketsRepository.countByMatchAndLocation).toHaveBeenCalledWith(
        10,
        7,
        txManager,
      );
      expect(result).toMatchObject({
        id: 90,
        code: 'TKT-M10-L7-ABCDEF12',
        price: 35000,
        fan: { id: 5 },
        location: { id: 7 },
        match: { id: 10 },
      });
    });

    it('rechaza con 409 cuando la localidad está agotada bajo bloqueo pesimista', async () => {
      const fan = createFan();
      const match = createMatch();
      const location = createLocation({ name: 'VIP', capacity: 30 });

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      locationsService.getLocationOrFail.mockResolvedValueOnce(location);
      txManager.findOne
        .mockResolvedValueOnce(location)
        .mockResolvedValueOnce(match);
      ticketsRepository.findByMatchAndFan.mockResolvedValueOnce(null);
      ticketsRepository.countByMatchAndLocation.mockResolvedValueOnce(30);

      await expect(
        service.purchaseMine(user, { matchId: 10, locationId: 7 }),
      ).rejects.toThrow(BusinessRuleException);
      expect(txManager.save).not.toHaveBeenCalled();
    });

    it('rechaza con 409 cuando el aficionado ya tiene boleto para el mismo partido', async () => {
      const fan = createFan();
      const match = createMatch();
      const location = createLocation();

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      locationsService.getLocationOrFail.mockResolvedValueOnce(location);
      txManager.findOne
        .mockResolvedValueOnce(location)
        .mockResolvedValueOnce(match);
      ticketsRepository.findByMatchAndFan.mockResolvedValueOnce(createTicket());

      await expect(
        service.purchaseMine(user, { matchId: 10, locationId: 7 }),
      ).rejects.toThrow('ya tiene un boleto registrado');
      expect(txManager.save).not.toHaveBeenCalled();
    });

    it('rechaza si la localidad pertenece a otro escenario o el partido/torneo no permite compra', async () => {
      const fan = createFan();
      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValue(fan);

      matchesService.getMatchOrFail.mockResolvedValueOnce(
        createMatch({ venueId: 3 }),
      );
      locationsService.getLocationOrFail.mockResolvedValueOnce(
        createLocation({ venueId: 99 }),
      );
      await expect(
        service.purchaseMine(user, { matchId: 10, locationId: 7 }),
      ).rejects.toThrow('no pertenece al escenario');

      matchesService.getMatchOrFail.mockResolvedValueOnce(
        createMatch({ status: MatchStatus.IN_PROGRESS }),
      );
      await expect(
        service.purchaseMine(user, { matchId: 10, locationId: 7 }),
      ).rejects.toThrow('solo se pueden comprar boletos');

      matchesService.getMatchOrFail.mockResolvedValueOnce(
        createMatch({ tournamentStatus: TournamentStatus.FINISHED }),
      );
      await expect(
        service.purchaseMine(user, { matchId: 10, locationId: 7 }),
      ).rejects.toThrow('ya terminó o fue cancelado');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('propiedad y eliminación en /me/tickets', () => {
    it('rechaza con 403 al consultar o eliminar un boleto de otro aficionado', async () => {
      fansService.getFanBySecurityUserOrFail.mockResolvedValueOnce(
        createFan({ id: 5 }),
      );
      ticketsRepository.findOneWithRelations.mockResolvedValueOnce(
        createTicket({ fan: createFan({ id: 99 }) }),
      );

      await expect(service.findOneMine(user, 90)).rejects.toThrow(
        'boleto de otro aficionado',
      );

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(
        createFan({ id: 5 }),
      );
      ticketsRepository.findOneWithRelations.mockResolvedValueOnce(
        createTicket({ fan: createFan({ id: 99 }) }),
      );

      await expect(service.removeMine(user, 90)).rejects.toThrow(
        'boleto de otro aficionado',
      );
      expect(ticketRepository.remove).not.toHaveBeenCalled();
    });

    it('bloquea la eliminación si el partido ya inició o finalizó', async () => {
      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(
        createFan({ id: 5 }),
      );
      ticketsRepository.findOneWithRelations.mockResolvedValueOnce(
        createTicket({ match: createMatch({ status: MatchStatus.FINISHED }) }),
      );

      await expect(service.removeMine(user, 90)).rejects.toThrow(
        'partido finalizado',
      );
      expect(ticketRepository.remove).not.toHaveBeenCalled();
    });
  });
});

