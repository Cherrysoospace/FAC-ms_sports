import type { Repository } from 'typeorm';
import { MatchStatus } from '../matches/enums/match-status.enum';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import { ContractStage } from '../team-players/enums/contract-stage.enum';
import { ContractStatus } from '../team-players/enums/contract-status.enum';
import type { Match } from '../matches/entities/match.entity';
import type { MatchesService } from '../matches/matches.service';
import type { MatchNotifier } from '../matches/match-notifier';
import type { Player } from '../players/entities/player.entity';
import type { PlayersService } from '../players/players.service';
import type { TeamPlayersService } from '../team-players/team-players.service';
import type { TeamPlayerResponseDto } from '../team-players/dto/team-player-response.dto';
import { Goal } from './entities/goal.entity';
import type { GoalsRepository } from './repositories/goals.repository';
import { GoalMapper } from './mappers/goal.mapper';
import { GoalsService } from './goals.service';

const makeMatch = (
  overrides: {
    status?: MatchStatus;
    tournamentStatus?: TournamentStatus;
  } = {},
) =>
  ({
    id: 5,
    scheduledAt: new Date(2026, 10, 20, 19, 0),
    status: overrides.status ?? MatchStatus.IN_PROGRESS,
    homeTeam: { id: 1, name: 'América' },
    awayTeam: { id: 2, name: 'Cali' },
    phase: {
      id: 3,
      name: 'Semifinal',
      tournament: {
        id: 8,
        name: 'Copa 2026',
        status: overrides.tournamentStatus ?? TournamentStatus.IN_PROGRESS,
      },
    },
  }) as unknown as Match;

const makePlayer = (id = 11, fullName = 'Juan Pérez') =>
  ({
    id,
    fullName,
    documentNumber: '100200300',
    position: 'DEL',
    active: true,
  }) as unknown as Player;

const makeContract = (teamId = 1): TeamPlayerResponseDto =>
  ({
    id: 1,
    team: { id: teamId, name: 'América', city: 'Cali', modality: 'MALE' },
    player: {
      id: 11,
      fullName: 'Juan Pérez',
      documentNumber: '100200300',
      position: 'DEL',
      age: 22,
    },
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: ContractStatus.ACTIVE,
    stage: ContractStage.CURRENT,
    releaseDate: null,
    releaseReason: null,
  }) as TeamPlayerResponseDto;

describe('GoalsService', () => {
  let service: GoalsService;
  const goalRepository = {
    save: jest.fn(async (goal: Goal) =>
      Object.assign(goal, { id: goal.id ?? 100 }),
    ),
    remove: jest.fn(async () => undefined),
  };
  const goalsRepository = {
    findByFilters: jest.fn(async () => [] as Goal[]),
    findOneWithRelations: jest.fn(),
  };
  const matchesService = {
    getMatchOrFail: jest.fn(),
  };
  const playersService = {
    getActivePlayerOrFail: jest.fn(),
  };
  const teamPlayersService = {
    findAll: jest.fn(async () => [makeContract(1)]),
  };
  const matchNotifier = {
    notifyGoalRecorded: jest.fn(async () => undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoalsService(
      goalRepository as unknown as Repository<Goal>,
      goalsRepository as unknown as GoalsRepository,
      new GoalMapper(),
      matchesService as unknown as MatchesService,
      playersService as unknown as PlayersService,
      teamPlayersService as unknown as TeamPlayersService,
      matchNotifier as unknown as MatchNotifier,
    );
  });

  describe('create', () => {
    it('registra anotación en partido en curso y notifica a la audiencia', async () => {
      const match = makeMatch({ status: MatchStatus.IN_PROGRESS });
      const player = makePlayer(11, 'Juan Pérez');
      const hydrated = {
        id: 100,
        minute: 34,
        points: 1,
        description: 'Gol de tiro libre',
        recordedAt: new Date('2026-11-20T19:34:00.000Z'),
        match,
        player,
      } as Goal;

      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      playersService.getActivePlayerOrFail.mockResolvedValueOnce(player);
      goalsRepository.findOneWithRelations.mockResolvedValueOnce(hydrated);

      const result = await service.create({
        matchId: 5,
        playerId: 11,
        minute: 34,
        description: 'Gol de tiro libre',
      });

      expect(goalRepository.save).toHaveBeenCalledTimes(1);
      expect(matchNotifier.notifyGoalRecorded).toHaveBeenCalledWith(
        match,
        hydrated,
      );
      expect(result).toMatchObject({
        id: 100,
        minute: 34,
        points: 1,
        description: 'Gol de tiro libre',
        match: { id: 5 },
        player: { id: 11, fullName: 'Juan Pérez' },
      });
    });

    it('permite registrar anotaciones de ajuste en un partido finalizado', async () => {
      const match = makeMatch({ status: MatchStatus.FINISHED });
      const player = makePlayer(11);
      const hydrated = {
        id: 101,
        minute: 88,
        points: 2,
        description: null,
        recordedAt: new Date(),
        match,
        player,
      } as Goal;

      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      playersService.getActivePlayerOrFail.mockResolvedValueOnce(player);
      goalsRepository.findOneWithRelations.mockResolvedValueOnce(hydrated);

      const result = await service.create({
        matchId: 5,
        playerId: 11,
        minute: 88,
        points: 2,
      });

      expect(result.points).toBe(2);
      expect(matchNotifier.notifyGoalRecorded).toHaveBeenCalledTimes(1);
    });

    it('rechaza si el partido sigue programado', async () => {
      matchesService.getMatchOrFail.mockResolvedValueOnce(
        makeMatch({ status: MatchStatus.SCHEDULED }),
      );

      await expect(
        service.create({ matchId: 5, playerId: 11, minute: 10 }),
      ).rejects.toThrow('inicie el partido primero');
      expect(playersService.getActivePlayerOrFail).not.toHaveBeenCalled();
      expect(goalRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza si el torneo del partido ya está cerrado', async () => {
      matchesService.getMatchOrFail.mockResolvedValueOnce(
        makeMatch({
          status: MatchStatus.FINISHED,
          tournamentStatus: TournamentStatus.FINISHED,
        }),
      );

      await expect(
        service.create({ matchId: 5, playerId: 11, minute: 10 }),
      ).rejects.toThrow('ya terminó o fue cancelado');
      expect(goalRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza si el jugador no pertenece a ninguno de los equipos del partido', async () => {
      matchesService.getMatchOrFail.mockResolvedValueOnce(makeMatch());
      playersService.getActivePlayerOrFail.mockResolvedValueOnce(makePlayer());
      teamPlayersService.findAll.mockResolvedValueOnce([makeContract(99)]);

      await expect(
        service.create({ matchId: 5, playerId: 11, minute: 20 }),
      ).rejects.toThrow('no pertenece a ninguno de los equipos participantes');
      expect(goalRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('valida el nuevo jugador cuando cambia playerId y guarda cambios', async () => {
      const match = makeMatch();
      const oldPlayer = makePlayer(11, 'Juan Pérez');
      const newPlayer = makePlayer(12, 'Luis Díaz');
      const existing = {
        id: 100,
        minute: 15,
        points: 1,
        description: 'Original',
        recordedAt: new Date(),
        match,
        player: oldPlayer,
      } as Goal;
      const updated = Object.assign(new Goal(), {
        id: 100,
        minute: 17,
        points: 1,
        description: null,
        recordedAt: existing.recordedAt,
        match,
        player: newPlayer,
      });

      goalsRepository.findOneWithRelations
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);
      playersService.getActivePlayerOrFail.mockResolvedValueOnce(newPlayer);
      teamPlayersService.findAll.mockResolvedValueOnce([makeContract(2)]);

      const result = await service.update(100, {
        playerId: 12,
        minute: 17,
        description: null,
      });

      expect(playersService.getActivePlayerOrFail).toHaveBeenCalledWith(12);
      expect(goalRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 100,
          minute: 17,
          description: null,
          player: newPlayer,
        }),
      );
      expect(result.player.id).toBe(12);
    });
  });

  describe('remove', () => {
    it('elimina únicamente la anotación cuando el partido y torneo lo permiten', async () => {
      const match = makeMatch({ status: MatchStatus.IN_PROGRESS });
      const goal = {
        id: 100,
        minute: 12,
        points: 1,
        description: null,
        recordedAt: new Date(),
        match,
        player: makePlayer(),
      } as Goal;

      goalsRepository.findOneWithRelations.mockResolvedValueOnce(goal);
      matchesService.getMatchOrFail.mockResolvedValueOnce(match);

      await expect(service.remove(100)).resolves.toEqual({
        message: 'Anotación #100 eliminada correctamente',
      });
      expect(goalRepository.remove).toHaveBeenCalledWith(goal);
    });

    it('responde 404 si la anotación no existe', async () => {
      goalsRepository.findOneWithRelations.mockResolvedValueOnce(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Anotación con id 999 no existe',
      );
      expect(goalRepository.remove).not.toHaveBeenCalled();
    });
  });
});
