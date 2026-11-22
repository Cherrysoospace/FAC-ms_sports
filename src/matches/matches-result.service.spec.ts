import type { DataSource, EntityManager, Repository } from 'typeorm';
import type {
  BetSettlementNotification,
  IBetSettlementPort,
} from '../common/contracts';
import { BetSelection } from '../bets/enums/bet-selection.enum';
import { BetStatus } from '../bets/enums/bet-status.enum';
import { Goal } from '../goals/entities/goal.entity';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import { Match } from './entities/match.entity';
import { MatchStatus } from './enums/match-status.enum';
import type { MatchNotifier } from './match-notifier';
import { MatchesService } from './matches.service';
import type { MatchesRepository } from './repositories/matches.repository';
import type { MatchDraftResolver } from './services/match-draft.resolver';
import { MatchResultService } from './services/match-result.service';

function createMatchEntity(
  overrides: Partial<{
    status: MatchStatus;
    tournamentStatus: TournamentStatus;
    homeScore: number | undefined;
    awayScore: number | undefined;
    bettingOpen: boolean;
  }> = {},
): Match {
  const phase = Object.assign(new GroupPhase(), {
    id: 4,
    name: 'Fase de grupos',
    groupName: 'A',
    tournament: {
      id: 1,
      name: 'Torneo Apertura',
      status: overrides.tournamentStatus ?? TournamentStatus.IN_PROGRESS,
    },
  });

  return {
    id: 10,
    scheduledAt: new Date('2026-11-20T18:00:00.000Z'),
    status: overrides.status ?? MatchStatus.IN_PROGRESS,
    homeScore: overrides.homeScore,
    awayScore: overrides.awayScore,
    bettingOpen: overrides.bettingOpen ?? false,
    phase,
    homeTeam: { id: 1, name: 'Leones' },
    awayTeam: { id: 2, name: 'Tigres' },
    venue: { id: 3, name: 'Estadio Central' },
    ball: { id: 9, brand: 'Golty', model: 'Pro' },
  } as unknown as Match;
}

describe('MatchesService (HU-GC-07 resultado y bloqueo por anotaciones)', () => {
  const matchRepository = {
    save: jest.fn(),
    remove: jest.fn(async () => undefined),
  };
  const matchesRepository = {
    findOneWithRelations: jest.fn(),
    findGoalsForSummary: jest.fn(async (): Promise<Goal[]> => []),
    countPositions: jest.fn(async () => 0),
    countGoals: jest.fn(async () => 0),
    countTickets: jest.fn(async () => 0),
    countBets: jest.fn(async () => 0),
  };
  const matchNotifier = {
    notifyNewMatch: jest.fn(async () => undefined),
    notifyMatchResult: jest.fn(async () => undefined),
  };

  let txManager: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let settleForMatchMock: jest.Mock;
  let cancelForMatchMock: jest.Mock;
  let notifySettlementBatchMock: jest.Mock;
  let betSettlementPort: IBetSettlementPort;
  let events: string[];

  const sampleSettlementNotifications: BetSettlementNotification[] = [
    {
      email: 'fan@uc.co',
      matchLabel: 'Leones vs Tigres',
      selection: BetSelection.HOME_WIN,
      amount: 50000,
      odds: 3,
      finalStatus: BetStatus.WON,
      payout: 150000,
      note: 'Resultado oficial 2 - 1 (Gana local)',
    },
  ];

  // Resultado final y cancelación con liquidación (MatchResultService)
  const buildResultService = (withBetPort = true) =>
    new MatchResultService(
      matchesRepository as unknown as MatchesRepository,
      matchNotifier as unknown as MatchNotifier,
      dataSource as unknown as DataSource,
      withBetPort ? betSettlementPort : undefined,
    );

  // CRUD de partidos; las validaciones de equipos/escenario/pelota no se usan aquí
  const buildService = (withBetPort = true) =>
    new MatchesService(
      matchRepository as unknown as Repository<Match>,
      matchesRepository as unknown as MatchesRepository,
      {} as MatchDraftResolver,
      buildResultService(withBetPort),
      matchNotifier as unknown as MatchNotifier,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    events = [];
    txManager = {
      findOne: jest.fn(),
      save: jest.fn(async (_entity: unknown, target: Match) => target),
    };
    dataSource = {
      transaction: jest.fn(
        async <T>(callback: (manager: EntityManager) => Promise<T>) => {
          const result = await callback(txManager as unknown as EntityManager);
          events.push('tx:end');
          return result;
        },
      ),
    };
    settleForMatchMock = jest.fn(async () => {
      events.push('tx:settle');
      return {
        matchId: 10,
        settledCount: 2,
        wonCount: 1,
        lostCount: 1,
        voidedCount: 0,
        totalPayout: 150000,
        pendingNotifications: sampleSettlementNotifications,
      };
    });
    cancelForMatchMock = jest.fn(async () => {
      events.push('tx:cancel');
      return {
        matchId: 10,
        settledCount: 0,
        wonCount: 0,
        lostCount: 0,
        voidedCount: 0,
        totalPayout: 0,
        pendingNotifications: [],
      };
    });
    notifySettlementBatchMock = jest.fn(async () => {
      events.push('notify:batch');
    });
    betSettlementPort = {
      settleForMatch: settleForMatchMock,
      cancelForMatch: cancelForMatchMock,
      notifySettlementBatch: notifySettlementBatchMock,
    };
  });

  describe('recordResult', () => {
    it('finaliza el partido, cierra apuestas, liquida por primera vez y notifica', async () => {
      const inProgress = createMatchEntity({
        status: MatchStatus.IN_PROGRESS,
        bettingOpen: false,
      });
      const locked = createMatchEntity({ status: MatchStatus.IN_PROGRESS });
      const finished = createMatchEntity({
        status: MatchStatus.FINISHED,
        homeScore: 2,
        awayScore: 1,
        bettingOpen: false,
      });

      const summaryGoals = [
        Object.assign(new Goal(), {
          id: 5,
          minute: 18,
          points: 1,
          description: 'Cabezazo',
          player: { fullName: 'Carlos Pérez' },
        }),
      ];
      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(inProgress)
        .mockResolvedValueOnce(finished);
      matchesRepository.findGoalsForSummary.mockResolvedValueOnce(summaryGoals);
      txManager.findOne.mockResolvedValueOnce(locked);

      const service = buildResultService(true);
      const result = await service.recordResult(10, {
        homeScore: 2,
        awayScore: 1,
      });

      expect(txManager.findOne).toHaveBeenCalledWith(Match, {
        where: { id: 10 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(locked.status).toBe(MatchStatus.FINISHED);
      expect(locked.homeScore).toBe(2);
      expect(locked.awayScore).toBe(1);
      expect(locked.bettingOpen).toBe(false);
      expect(settleForMatchMock).toHaveBeenCalledWith(
        {
          matchId: 10,
          homeTeamId: 1,
          awayTeamId: 2,
          homeScore: 2,
          awayScore: 1,
        },
        txManager,
      );
      expect(notifySettlementBatchMock).toHaveBeenCalledWith(
        sampleSettlementNotifications,
      );
      expect(events).toEqual(['tx:settle', 'tx:end', 'notify:batch']);
      expect(matchesRepository.findGoalsForSummary).toHaveBeenCalledWith(10);
      expect(matchNotifier.notifyMatchResult).toHaveBeenCalledWith(
        finished,
        true,
        summaryGoals,
      );
      expect(result).toMatchObject({
        id: 10,
        status: MatchStatus.FINISHED,
        homeScore: 2,
        awayScore: 1,
      });
    });

    it('permite corregir el marcador en un partido ya FINISHED sin volver a liquidar apuestas', async () => {
      const alreadyFinished = createMatchEntity({
        status: MatchStatus.FINISHED,
        homeScore: 1,
        awayScore: 0,
      });
      const locked = createMatchEntity({
        status: MatchStatus.FINISHED,
        homeScore: 1,
        awayScore: 0,
      });
      const corrected = createMatchEntity({
        status: MatchStatus.FINISHED,
        homeScore: 2,
        awayScore: 0,
      });

      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(alreadyFinished)
        .mockResolvedValueOnce(corrected);
      txManager.findOne.mockResolvedValueOnce(locked);

      const service = buildResultService(true);
      const result = await service.recordResult(10, {
        homeScore: 2,
        awayScore: 0,
      });

      expect(settleForMatchMock).not.toHaveBeenCalled();
      expect(matchNotifier.notifyMatchResult).toHaveBeenCalledWith(
        corrected,
        false,
        [],
      );
      expect(result.homeScore).toBe(2);
    });

    it('funciona cuando el puerto de liquidación aún no está conectado', async () => {
      const inProgress = createMatchEntity({ status: MatchStatus.IN_PROGRESS });
      const locked = createMatchEntity({ status: MatchStatus.IN_PROGRESS });
      const finished = createMatchEntity({
        status: MatchStatus.FINISHED,
        homeScore: 0,
        awayScore: 0,
      });

      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(inProgress)
        .mockResolvedValueOnce(finished);
      txManager.findOne.mockResolvedValueOnce(locked);

      const service = buildResultService(false);
      await expect(
        service.recordResult(10, { homeScore: 0, awayScore: 0 }),
      ).resolves.toMatchObject({ status: MatchStatus.FINISHED });
      expect(matchNotifier.notifyMatchResult).toHaveBeenCalledWith(
        finished,
        true,
        [],
      );
    });

    it('rechaza registrar resultado si el partido está SCHEDULED, CANCELLED o en torneo cerrado', async () => {
      const service = buildResultService(true);

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.SCHEDULED }),
      );
      await expect(
        service.recordResult(10, { homeScore: 1, awayScore: 0 }),
      ).rejects.toThrow('debe iniciarse');

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.CANCELLED }),
      );
      await expect(
        service.recordResult(10, { homeScore: 1, awayScore: 0 }),
      ).rejects.toThrow('cancelado');

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({
          status: MatchStatus.IN_PROGRESS,
          tournamentStatus: TournamentStatus.FINISHED,
        }),
      );
      await expect(
        service.recordResult(10, { homeScore: 1, awayScore: 0 }),
      ).rejects.toThrow('ya terminó o fue cancelado');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('bloquea con 409 cuando el partido tiene anotaciones registradas', async () => {
      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.CANCELLED }),
      );
      matchesRepository.countPositions.mockResolvedValueOnce(0);
      matchesRepository.countGoals.mockResolvedValueOnce(2);

      const service = buildService(true);
      await expect(service.remove(10)).rejects.toThrow('2 anotaciones');
      expect(matchRepository.remove).not.toHaveBeenCalled();
    });

    it('incluye seguimiento espacial y anotaciones en el mensaje de conflicto', async () => {
      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.CANCELLED }),
      );
      matchesRepository.countPositions.mockResolvedValueOnce(3);
      matchesRepository.countGoals.mockResolvedValueOnce(1);

      const service = buildService(true);
      await expect(service.remove(10)).rejects.toThrow(
        'seguimiento espacial y 1 anotación',
      );
      expect(matchRepository.remove).not.toHaveBeenCalled();
    });

    it('bloquea con 409 cuando tiene boletos, apuestas o todas las dependencias asociadas', async () => {
      const service = buildService(true);

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.SCHEDULED }),
      );
      matchesRepository.countTickets.mockResolvedValueOnce(2);
      await expect(service.remove(10)).rejects.toThrow('2 boletos');

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.SCHEDULED }),
      );
      matchesRepository.countBets.mockResolvedValueOnce(3);
      await expect(service.remove(10)).rejects.toThrow('3 apuestas');

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.CANCELLED }),
      );
      matchesRepository.countPositions.mockResolvedValueOnce(4);
      matchesRepository.countGoals.mockResolvedValueOnce(1);
      matchesRepository.countTickets.mockResolvedValueOnce(2);
      matchesRepository.countBets.mockResolvedValueOnce(3);
      await expect(service.remove(10)).rejects.toThrow(
        'seguimiento espacial, 1 anotación, 2 boletos y 3 apuestas',
      );
      expect(matchRepository.remove).not.toHaveBeenCalled();
    });

    it('elimina el partido cuando no tiene dependencias asociadas', async () => {
      const scheduled = createMatchEntity({ status: MatchStatus.SCHEDULED });
      matchesRepository.findOneWithRelations.mockResolvedValueOnce(scheduled);

      const service = buildService(true);
      await expect(service.remove(10)).resolves.toEqual({
        message: 'Partido #10 eliminado correctamente',
      });
      expect(matchRepository.remove).toHaveBeenCalledWith(scheduled);
    });
  });

  describe('cancelación en update (HU-GC-11)', () => {
    it('bloquea el partido, cierra apuestas y anula apuestas en la transacción y notifica después', async () => {
      const scheduled = createMatchEntity({
        status: MatchStatus.SCHEDULED,
        bettingOpen: true,
      });
      const locked = createMatchEntity({
        status: MatchStatus.SCHEDULED,
        bettingOpen: true,
      });
      const cancelled = createMatchEntity({
        status: MatchStatus.CANCELLED,
        bettingOpen: false,
      });
      const cancelNotifications: BetSettlementNotification[] = [
        {
          ...sampleSettlementNotifications[0],
          finalStatus: BetStatus.VOID,
          payout: 50000,
          note: 'El partido fue cancelado',
        },
      ];

      cancelForMatchMock.mockImplementationOnce(async () => {
        events.push('tx:cancel');
        return {
          matchId: 10,
          settledCount: 1,
          wonCount: 0,
          lostCount: 0,
          voidedCount: 1,
          totalPayout: 50000,
          pendingNotifications: cancelNotifications,
        };
      });

      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(scheduled)
        .mockResolvedValueOnce(cancelled);
      txManager.findOne.mockResolvedValueOnce(locked);

      const service = buildService(true);
      const result = await service.update(10, {
        status: MatchStatus.CANCELLED,
      });

      expect(txManager.findOne).toHaveBeenCalledWith(Match, {
        where: { id: 10 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(locked.status).toBe(MatchStatus.CANCELLED);
      expect(locked.bettingOpen).toBe(false);
      expect(cancelForMatchMock).toHaveBeenCalledWith(
        10,
        'El partido fue cancelado',
        txManager,
      );
      expect(notifySettlementBatchMock).toHaveBeenCalledWith(
        cancelNotifications,
      );
      expect(events).toEqual(['tx:cancel', 'tx:end', 'notify:batch']);
      expect(result.status).toBe(MatchStatus.CANCELLED);
    });
  });

  describe('cierre y reapertura manual de apuestas (bettingOpen)', () => {
    it('permite cerrar y reabrir apuestas manualmente cuando el partido está SCHEDULED', async () => {
      const scheduledOpen = createMatchEntity({
        status: MatchStatus.SCHEDULED,
        bettingOpen: true,
      });
      const savedClosed = createMatchEntity({
        status: MatchStatus.SCHEDULED,
        bettingOpen: false,
      });
      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(scheduledOpen)
        .mockResolvedValueOnce(savedClosed);

      const service = buildService(true);
      const closed = await service.update(10, { bettingOpen: false });

      expect(matchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ bettingOpen: false }),
      );
      expect(closed.bettingOpen).toBe(false);

      const scheduledClosed = createMatchEntity({
        status: MatchStatus.SCHEDULED,
        bettingOpen: false,
      });
      const savedOpen = createMatchEntity({
        status: MatchStatus.SCHEDULED,
        bettingOpen: true,
      });
      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(scheduledClosed)
        .mockResolvedValueOnce(savedOpen);

      const reopened = await service.update(10, { bettingOpen: true });

      expect(matchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ bettingOpen: true }),
      );
      expect(reopened.bettingOpen).toBe(true);
    });

    it('rechaza cambiar bettingOpen si el partido no está SCHEDULED, si intenta abrirlo al iniciar o en torneo cerrado', async () => {
      const service = buildService(true);

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.IN_PROGRESS }),
      );
      await expect(service.update(10, { bettingOpen: true })).rejects.toThrow(
        'partidos programados',
      );

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.FINISHED }),
      );
      await expect(service.update(10, { bettingOpen: false })).rejects.toThrow(
        'partidos programados',
      );

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({ status: MatchStatus.SCHEDULED, bettingOpen: true }),
      );
      await expect(
        service.update(10, {
          status: MatchStatus.IN_PROGRESS,
          bettingOpen: true,
        }),
      ).rejects.toThrow('dejar las apuestas abiertas');

      matchesRepository.findOneWithRelations.mockResolvedValueOnce(
        createMatchEntity({
          status: MatchStatus.SCHEDULED,
          bettingOpen: false,
          tournamentStatus: TournamentStatus.FINISHED,
        }),
      );
      await expect(service.update(10, { bettingOpen: true })).rejects.toThrow(
        'ya terminó o fue cancelado',
      );
      expect(matchRepository.save).not.toHaveBeenCalled();
    });
  });
});
