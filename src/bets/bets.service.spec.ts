import type { DataSource, EntityManager } from 'typeorm';
import { Fan } from '../fans/entities/fan.entity';
import type { FansService } from '../fans/fans.service';
import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import type { MatchesService } from '../matches/matches.service';
import { FanPaymentMethod } from '../payment-methods/entities/fan-payment-method.entity';
import { PaymentMethodType } from '../payment-methods/enums/payment-method-type.enum';
import type { FanPaymentMethodsService } from '../payment-methods/fan-payment-methods.service';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import type { BetNotifier } from './bet-notifier';
import { BetsService } from './bets.service';
import { Bet } from './entities/bet.entity';
import { BetSelection } from './enums/bet-selection.enum';
import { BetStatus } from './enums/bet-status.enum';
import { BetMapper } from './mappers/bet.mapper';
import type { BetsRepository } from './repositories/bets.repository';

function createMatch(
  overrides: Partial<{
    id: number;
    status: MatchStatus;
    bettingOpen: boolean;
    tournamentStatus: TournamentStatus;
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
    scheduledAt: new Date('2026-11-28T19:00:00.000Z'),
    status: overrides.status ?? MatchStatus.SCHEDULED,
    bettingOpen: overrides.bettingOpen ?? true,
    homeScore: undefined,
    awayScore: undefined,
    phase,
    homeTeam: { id: 1, name: 'Leones' },
    awayTeam: { id: 2, name: 'Tigres' },
    venue: { id: 3, name: 'Estadio Central' },
  } as unknown as Match;
}

function createFan(id = 5): Fan {
  return Object.assign(new Fan(), {
    id,
    securityUserId: 77,
    fullName: 'Sofía Castro',
    documentNumber: '1009988776',
    email: 'sofia@correo.com',
    active: true,
  });
}

function createPaymentMethod(id = 8): FanPaymentMethod {
  return Object.assign(new FanPaymentMethod(), {
    id,
    alias: 'Mi Visa',
    reference: '****4242',
    active: true,
    paymentMethod: {
      id: 3,
      name: 'Tarjeta de crédito',
      type: PaymentMethodType.CARD,
      active: true,
    },
  });
}

function createBet(overrides: Partial<Bet> = {}): Bet {
  return Object.assign(new Bet(), {
    id: 44,
    selection: BetSelection.HOME_WIN,
    amount: '50000.00',
    odds: '2.15',
    status: BetStatus.PENDING,
    payout: null,
    placedAt: new Date('2026-11-21T02:10:00.000Z'),
    settledAt: null,
    settlementNote: null,
    match: createMatch(),
    fan: createFan(),
    fanPaymentMethod: createPaymentMethod(),
    ...overrides,
  });
}

describe('BetsService', () => {
  let service: BetsService;
  const user: AuthenticatedUser = { id: 77, email: 'sofia@correo.com' };

  const betsRepository = {
    findByFilters: jest.fn(async () => [] as Bet[]),
    findOneWithRelations: jest.fn(async () => null as Bet | null),
    findByMatchAndFan: jest.fn(async () => null as Bet | null),
  };
  const matchesService = {
    getMatchOrFail: jest.fn(),
    findAvailableForBetting: jest.fn(async () => []),
  };
  const fansService = {
    getActiveFanOrFail: jest.fn(),
    getFanBySecurityUserOrFail: jest.fn(),
    getActiveFanBySecurityUserOrFail: jest.fn(),
  };
  const fanPaymentMethodsService = {
    getOwnedActiveMethodOrFail: jest.fn(),
  };
  const betNotifier = {
    notifyBetPlaced: jest.fn(async () => undefined),
    notifyBetSettled: jest.fn(async () => undefined),
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
      save: jest.fn(async (_entity: unknown, target: Bet) =>
        Object.assign(target, { id: target.id ?? 44 }),
      ),
    };
    dataSource = {
      transaction: jest.fn(
        async (callback: (manager: EntityManager) => Promise<unknown>) =>
          callback(txManager as unknown as EntityManager),
      ),
    };

    service = new BetsService(
      betsRepository as unknown as BetsRepository,
      new BetMapper(),
      matchesService as unknown as MatchesService,
      fansService as unknown as FansService,
      fanPaymentMethodsService as unknown as FanPaymentMethodsService,
      betNotifier as unknown as BetNotifier,
      dataSource as unknown as DataSource,
    );
  });

  describe('placeMine', () => {
    it('registra apuesta validando método propio, bloqueo pesimista y notifica', async () => {
      const fan = createFan();
      const match = createMatch();
      const paymentMethod = createPaymentMethod();
      const hydrated = createBet();

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      fanPaymentMethodsService.getOwnedActiveMethodOrFail.mockResolvedValueOnce(
        paymentMethod,
      );
      txManager.findOne.mockResolvedValueOnce(match);
      betsRepository.findByMatchAndFan.mockResolvedValueOnce(null);
      betsRepository.findOneWithRelations.mockResolvedValueOnce(hydrated);

      const result = await service.placeMine(user, {
        matchId: 10,
        fanPaymentMethodId: 8,
        selection: BetSelection.HOME_WIN,
        amount: 50000,
        odds: 2.15,
      });

      expect(
        fanPaymentMethodsService.getOwnedActiveMethodOrFail,
      ).toHaveBeenCalledWith(5, 8);
      expect(txManager.findOne).toHaveBeenCalledWith(Match, {
        where: { id: 10 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(betNotifier.notifyBetPlaced).toHaveBeenCalledWith(hydrated);
      expect(result).toMatchObject({
        id: 44,
        selection: BetSelection.HOME_WIN,
        amount: 50000,
        odds: 2.15,
        potentialPayout: 107500,
        status: BetStatus.PENDING,
        payout: null,
      });
    });

    it('rechaza con 409 si el aficionado ya apostó en el partido (R17 estricto)', async () => {
      const fan = createFan();
      const match = createMatch();

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      fanPaymentMethodsService.getOwnedActiveMethodOrFail.mockResolvedValueOnce(
        createPaymentMethod(),
      );
      txManager.findOne.mockResolvedValueOnce(match);
      betsRepository.findByMatchAndFan.mockResolvedValueOnce(createBet());

      await expect(
        service.placeMine(user, {
          matchId: 10,
          fanPaymentMethodId: 8,
          selection: BetSelection.DRAW,
          amount: 10000,
          odds: 3.1,
        }),
      ).rejects.toThrow('ya tiene una apuesta registrada');
      expect(txManager.save).not.toHaveBeenCalled();
    });

    it('rechaza apostar si el partido ya inició o cerró apuestas', async () => {
      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValue(
        createFan(),
      );
      matchesService.getMatchOrFail.mockResolvedValueOnce(
        createMatch({ status: MatchStatus.IN_PROGRESS, bettingOpen: false }),
      );

      await expect(
        service.placeMine(user, {
          matchId: 10,
          fanPaymentMethodId: 8,
          selection: BetSelection.HOME_WIN,
          amount: 10000,
          odds: 1.8,
        }),
      ).rejects.toThrow('en curso');

      matchesService.getMatchOrFail.mockResolvedValueOnce(
        createMatch({ status: MatchStatus.SCHEDULED, bettingOpen: false }),
      );
      await expect(
        service.placeMine(user, {
          matchId: 10,
          fanPaymentMethodId: 8,
          selection: BetSelection.HOME_WIN,
          amount: 10000,
          odds: 1.8,
        }),
      ).rejects.toThrow('cerradas');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('edición, cancelación y anulación', () => {
    it('rechaza con 403 consultar, editar o cancelar la apuesta de otro aficionado', async () => {
      const otherBet = createBet({ fan: createFan(99) });
      fansService.getFanBySecurityUserOrFail.mockResolvedValueOnce(
        createFan(5),
      );
      betsRepository.findOneWithRelations.mockResolvedValueOnce(otherBet);

      await expect(service.findOneMine(user, 44)).rejects.toThrow(
        'otro aficionado',
      );

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValue(
        createFan(5),
      );
      betsRepository.findOneWithRelations.mockResolvedValue(otherBet);

      await expect(
        service.updateMine(user, 44, { amount: 70000 }),
      ).rejects.toThrow('otro aficionado');
      await expect(service.cancelMine(user, 44, {})).rejects.toThrow(
        'otro aficionado',
      );
    });

    it('permite modificar monto/selección antes de iniciar sin alterar la cuota fija', async () => {
      const fan = createFan(5);
      const match = createMatch();
      const lockedBet = createBet({ odds: '2.15', amount: '50000.00' });
      const updated = createBet({
        selection: BetSelection.AWAY_WIN,
        amount: '80000.00',
        odds: '2.15',
      });

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      betsRepository.findOneWithRelations
        .mockResolvedValueOnce(createBet())
        .mockResolvedValueOnce(updated);
      txManager.findOne
        .mockResolvedValueOnce(match)
        .mockResolvedValueOnce(lockedBet);

      const result = await service.updateMine(user, 44, {
        selection: BetSelection.AWAY_WIN,
        amount: 80000,
      });

      expect(lockedBet.odds).toBe('2.15');
      expect(lockedBet.amount).toBe('80000.00');
      expect(result).toMatchObject({
        selection: BetSelection.AWAY_WIN,
        amount: 80000,
        odds: 2.15,
      });
    });

    it('cancela apuesta pendiente devolviendo el valor apostado y notifica', async () => {
      const fan = createFan(5);
      const match = createMatch();
      const lockedBet = createBet({ amount: '50000.00' });
      const cancelled = createBet({
        status: BetStatus.CANCELLED,
        payout: '50000.00',
        settlementNote: 'Cambio de opinión',
      });

      fansService.getActiveFanBySecurityUserOrFail.mockResolvedValueOnce(fan);
      betsRepository.findOneWithRelations
        .mockResolvedValueOnce(createBet())
        .mockResolvedValueOnce(cancelled);
      txManager.findOne
        .mockResolvedValueOnce(match)
        .mockResolvedValueOnce(lockedBet);

      const result = await service.cancelMine(user, 44, {
        reason: 'Cambio de opinión',
      });

      expect(lockedBet.status).toBe(BetStatus.CANCELLED);
      expect(lockedBet.payout).toBe('50000.00');
      expect(betNotifier.notifyBetSettled).toHaveBeenCalledWith(cancelled);
      expect(result.status).toBe(BetStatus.CANCELLED);
      expect(result.payout).toBe(50000);
    });

    it('permite al administrador anular apuesta pendiente y bloquea anular dos veces', async () => {
      const match = createMatch();
      const lockedBet = createBet({ amount: '40000.00' });
      const voided = createBet({
        status: BetStatus.VOID,
        payout: '40000.00',
      });

      betsRepository.findOneWithRelations
        .mockResolvedValueOnce(createBet())
        .mockResolvedValueOnce(voided);
      txManager.findOne
        .mockResolvedValueOnce(match)
        .mockResolvedValueOnce(lockedBet);

      const result = await service.voidBet(44, { reason: 'Irregularidad' });
      expect(result.status).toBe(BetStatus.VOID);
      expect(result.payout).toBe(40000);
      expect(betNotifier.notifyBetSettled).toHaveBeenCalledWith(voided);

      betsRepository.findOneWithRelations.mockResolvedValueOnce(voided);
      await expect(service.voidBet(44, {})).rejects.toThrow(
        'no puede liquidarse ni anularse más de una vez',
      );
    });
  });

  describe('findAvailableMatches', () => {
    it('delega en MatchesService la consulta de partidos habilitados para apostar', async () => {
      await service.findAvailableMatches({ tournamentId: 1 });
      expect(matchesService.findAvailableForBetting).toHaveBeenCalledWith({
        tournamentId: 1,
      });
    });
  });
});

