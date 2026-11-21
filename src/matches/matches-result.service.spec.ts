import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { IBetSettlementPort } from '../common/contracts';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import type { BallsService } from '../balls/balls.service';
import type { TeamsService } from '../teams/teams.service';
import type { TournamentVenuesService } from '../tournament-venues/tournament-venues.service';
import type { VenuesService } from '../venues/venues.service';
import { Match } from './entities/match.entity';
import { MatchStatus } from './enums/match-status.enum';
import type { MatchNotifier } from './match-notifier';
import { MatchesService } from './matches.service';
import type { MatchesRepository } from './repositories/matches.repository';

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
    countPositions: jest.fn(async () => 0),
    countGoals: jest.fn(async () => 0),
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
  let betSettlementPort: IBetSettlementPort;

  const buildService = (withBetPort = true) =>
    new MatchesService(
      matchRepository as unknown as Repository<Match>,
      matchesRepository as unknown as MatchesRepository,
      {} as TeamsService,
      {} as VenuesService,
      {} as BallsService,
      {} as TournamentVenuesService,
      matchNotifier as unknown as MatchNotifier,
      dataSource as unknown as DataSource,
      withBetPort ? betSettlementPort : undefined,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    txManager = {
      findOne: jest.fn(),
      save: jest.fn(async (_entity: unknown, target: Match) => target),
    };
    dataSource = {
      transaction: jest.fn(
        async (callback: (manager: EntityManager) => Promise<boolean>) =>
          callback(txManager as unknown as EntityManager),
      ),
    };
    settleForMatchMock = jest.fn(async () => ({
      matchId: 10,
      settledCount: 2,
      wonCount: 1,
      lostCount: 1,
      voidedCount: 0,
      totalPayout: 150000,
    }));
    cancelForMatchMock = jest.fn();
    betSettlementPort = {
      settleForMatch: settleForMatchMock,
      cancelForMatch: cancelForMatchMock,
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

      matchesRepository.findOneWithRelations
        .mockResolvedValueOnce(inProgress)
        .mockResolvedValueOnce(finished);
      txManager.findOne.mockResolvedValueOnce(locked);

      const service = buildService(true);
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
      expect(matchNotifier.notifyMatchResult).toHaveBeenCalledWith(
        finished,
        true,
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

      const service = buildService(true);
      const result = await service.recordResult(10, {
        homeScore: 2,
        awayScore: 0,
      });

      expect(settleForMatchMock).not.toHaveBeenCalled();
      expect(matchNotifier.notifyMatchResult).toHaveBeenCalledWith(
        corrected,
        false,
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

      const service = buildService(false);
      await expect(
        service.recordResult(10, { homeScore: 0, awayScore: 0 }),
      ).resolves.toMatchObject({ status: MatchStatus.FINISHED });
      expect(matchNotifier.notifyMatchResult).toHaveBeenCalledWith(
        finished,
        true,
      );
    });

    it('rechaza registrar resultado si el partido está SCHEDULED, CANCELLED o en torneo cerrado', async () => {
      const service = buildService(true);

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
  });
});
