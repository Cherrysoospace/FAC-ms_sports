import { TournamentDevelopmentService } from './tournament-development.service';
import {
  TournamentDevelopmentData,
  TournamentDevelopmentRepository,
} from './repositories/tournament-development.repository';
import { TournamentsService } from '../tournaments/tournaments.service';
import { ResourceNotFoundException } from '../common/exceptions';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import { FinalPhase } from '../phases/entities/final-phase.entity';
import { FinalRound } from '../phases/enums/final-round.enum';
import { Team } from '../teams/entities/team.entity';
import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import { Goal } from '../goals/entities/goal.entity';
import {
  DevelopmentFinalRoundDto,
  DevelopmentGroupStageDto,
} from './dto/tournament-development-response.dto';

const TOURNAMENT = Object.assign(new Tournament(), {
  id: 7,
  name: 'Copa Caldas',
  sport: { id: 1, name: 'Fútbol' },
  status: TournamentStatus.IN_PROGRESS,
  startDate: '2026-12-01',
  endDate: '2026-12-31',
  registrationOpensAt: new Date('2026-11-01T00:00:00'),
  registrationClosesAt: new Date('2026-11-20T00:00:00'),
  active: true,
});

const groupA = Object.assign(new GroupPhase(), {
  id: 1,
  name: 'Fase de grupos',
  order: 1,
  groupName: 'A',
  startDate: '2026-12-01',
  endDate: '2026-12-10',
});
const final = Object.assign(new FinalPhase(), {
  id: 2,
  name: 'Final',
  order: 2,
  round: FinalRound.FINAL,
});

const team = (id: number, name: string) =>
  Object.assign(new Team(), { id, name, group: groupA });
const A = team(1, 'Águilas');
const B = team(2, 'Búhos');
const VENUE = { id: 5, name: 'Estadio Palogrande' };

const match = (
  id: number,
  phase: GroupPhase | FinalPhase,
  status: MatchStatus,
  homeScore?: number,
  awayScore?: number,
) =>
  Object.assign(new Match(), {
    id,
    phase,
    status,
    homeScore,
    awayScore,
    scheduledAt: new Date(2026, 11, id, 15, 0),
    homeTeam: A,
    awayTeam: B,
    venue: VENUE,
  });

const playedGroup = match(1, groupA, MatchStatus.FINISHED, 2, 1);
const cancelledGroup = match(2, groupA, MatchStatus.CANCELLED);
const pendingFinal = match(3, final, MatchStatus.SCHEDULED);

const goal = Object.assign(new Goal(), {
  id: 9,
  minute: 30,
  points: 1,
  description: null,
  match: { id: playedGroup.id },
  player: {
    id: 20,
    fullName: 'Juan Pérez',
    teamPlayers: [{ startDate: '2026-01-01', endDate: '2027-01-01', team: A }],
  },
});

const DATA: TournamentDevelopmentData = {
  groups: [groupA],
  finals: [final],
  teams: [A, B],
  matches: [playedGroup, cancelledGroup, pendingFinal],
  goals: [goal],
  // Más inscritos activos que equipos en grupos: el resumen usa este conteo
  activeRegistrationsCount: 4,
};

describe('TournamentDevelopmentService.getDevelopment', () => {
  const getTournamentOrFail = jest.fn();
  const loadByTournament = jest.fn();
  let service: TournamentDevelopmentService;

  // Construcción directa (como el resto de specs): @nestjs/testing v12 es ESM.
  beforeEach(() => {
    jest.clearAllMocks();
    service = new TournamentDevelopmentService(
      { getTournamentOrFail } as unknown as TournamentsService,
      { loadByTournament } as unknown as TournamentDevelopmentRepository,
    );
  });

  it('404 si el torneo no existe y no consulta el desarrollo', async () => {
    getTournamentOrFail.mockRejectedValue(
      ResourceNotFoundException.of('Torneo', 99),
    );
    await expect(service.getDevelopment(99)).rejects.toThrow(
      'Torneo con id 99 no existe',
    );
    expect(loadByTournament).not.toHaveBeenCalled();
  });

  describe('con datos', () => {
    beforeEach(() => {
      getTournamentOrFail.mockResolvedValue(TOURNAMENT);
      loadByTournament.mockResolvedValue(DATA);
    });

    it('consulta solo el torneo seleccionado', async () => {
      await service.getDevelopment(7);
      expect(getTournamentOrFail).toHaveBeenCalledWith(7);
      expect(loadByTournament).toHaveBeenCalledTimes(1);
      expect(loadByTournament).toHaveBeenCalledWith(7);
    });

    it('arma la información general y el resumen', async () => {
      const result = await service.getDevelopment(7);
      expect(result.tournament).toMatchObject({
        id: 7,
        name: 'Copa Caldas',
        sport: { id: 1, name: 'Fútbol' },
        status: TournamentStatus.IN_PROGRESS,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
      expect(result.summary).toEqual({
        // inscripciones ACTIVE, no los 2 equipos de los grupos
        teams: 4,
        matches: 3,
        finishedMatches: 1,
        pendingMatches: 1,
        cancelledMatches: 1,
        goals: 1,
        // 1 con resultado de 2 no cancelados
        completionPercentage: 50,
        // El grupo no tiene pendientes (uno jugado, uno cancelado); la final sí
        currentPhase: {
          id: 2,
          name: 'Final',
          type: 'FINAL',
          round: FinalRound.FINAL,
        },
        // Final sin jugar y grupo sin qualifiersCount
        eliminatedTeams: [],
      });
    });

    it('fases en orden: grupos con equipos, tabla y partidos; final en llaves', async () => {
      const { phases } = await service.getDevelopment(7);
      expect(phases.map((p) => [p.type, p.order])).toEqual([
        ['GROUP', 1],
        ['FINAL', 2],
      ]);

      const stage = phases[0] as DevelopmentGroupStageDto;
      const [group] = stage.groups;
      expect(group.label).toBe('Grupo A');
      expect(group.teams.map((t) => t.id)).toEqual([1, 2]);
      expect(group.standings[0]).toMatchObject({
        position: 1,
        team: { id: 1 },
        played: 1,
        points: 3,
      });
      expect(group.matches.map((m) => [m.id, m.hasResult])).toEqual([
        [1, true],
        [2, false],
      ]);
      expect(group.matches[0]).toMatchObject({
        homeScore: 2,
        awayScore: 1,
        venue: { id: 5, name: 'Estadio Palogrande' },
      });
      expect(group.matches[0].goals).toEqual([
        {
          id: 9,
          minute: 30,
          points: 1,
          description: null,
          player: { id: 20, fullName: 'Juan Pérez' },
          team: { id: 1, name: 'Águilas' },
        },
      ]);

      const finalRound = phases[1] as DevelopmentFinalRoundDto;
      expect(finalRound.label).toBe('Final');
      expect(finalRound.ties).toHaveLength(1);
      expect(finalRound.ties[0]).toMatchObject({
        winner: null,
        teamAScore: null,
      });
      expect(finalRound.ties[0].matches[0]).toMatchObject({
        id: 3,
        hasResult: false,
        homeScore: null,
        goals: [],
      });
    });
  });
});
