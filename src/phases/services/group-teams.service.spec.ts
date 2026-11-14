import type { Repository } from 'typeorm';
import type { Team } from '../../teams/entities/team.entity';
import type { GroupPhase } from '../entities/group-phase.entity';
import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { GroupTeamsService } from './group-teams.service';
import type { GroupPhasesService } from './group-phases.service';
import type { PhaseRulesService } from './phase-rules.service';
import type { PhasesRepository } from '../repositories/phases.repository';
import type { TeamsService } from '../../teams/teams.service';
import type { RegistrationsService } from '../../registrations/registrations.service';

const tournament = (
  id: number,
  status: TournamentStatus,
  name = `Copa ${id}`,
) => ({
  id,
  name,
  status,
});

// Grupo A del torneo 10 (abierto), donde se asignan los equipos.
const GROUP_A = {
  id: 1,
  groupName: 'A',
  tournament: tournament(
    10,
    TournamentStatus.REGISTRATION_OPEN,
    'Copa Abierta',
  ),
} as unknown as GroupPhase;

const team = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 7,
    name: 'Millonarios',
    active: true,
    group: null,
    ...overrides,
  }) as unknown as Team;

describe('GroupTeamsService', () => {
  let service: GroupTeamsService;
  const teamRepository = {
    find: jest.fn(async () => [] as Team[]),
    findOne: jest.fn(),
    update: jest.fn(async () => undefined),
  };
  const groupPhasesService = { getGroupOrFail: jest.fn(async () => GROUP_A) };
  const phasesRepository = { countTeamMatchesInPhase: jest.fn(async () => 0) };
  const phaseRules = { assertTournamentEditable: jest.fn() };
  const teamsService = { getActiveTeamOrFail: jest.fn() };
  const registrationsService = {
    isTeamActivelyRegistered: jest.fn(async () => true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GroupTeamsService(
      teamRepository as unknown as Repository<Team>,
      groupPhasesService as unknown as GroupPhasesService,
      phasesRepository as unknown as PhasesRepository,
      phaseRules as unknown as PhaseRulesService,
      teamsService as unknown as TeamsService,
      registrationsService as unknown as RegistrationsService,
    );
  });

  describe('assignTeam', () => {
    it('equipo inactivo: propaga el error de TeamsService', async () => {
      teamsService.getActiveTeamOrFail.mockRejectedValue(
        new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          'El equipo Millonarios está inactivo',
        ),
      );

      await expect(service.assignTeam(1, { teamId: 7 })).rejects.toThrow(
        'El equipo Millonarios está inactivo',
      );
      expect(teamsService.getActiveTeamOrFail).toHaveBeenCalledWith(7);
      expect(
        registrationsService.isTeamActivelyRegistered,
      ).not.toHaveBeenCalled();
      expect(teamRepository.update).not.toHaveBeenCalled();
    });

    it('equipo no inscrito en el torneo del grupo', async () => {
      teamsService.getActiveTeamOrFail.mockResolvedValue(team());
      registrationsService.isTeamActivelyRegistered.mockResolvedValueOnce(
        false,
      );

      await expect(service.assignTeam(1, { teamId: 7 })).rejects.toThrow(
        'El equipo no está inscrito en el torneo',
      );
      expect(
        registrationsService.isTeamActivelyRegistered,
      ).toHaveBeenCalledWith(10, 7);
      expect(teamRepository.update).not.toHaveBeenCalled();
    });

    it('ya está en otro grupo de un torneo abierto', async () => {
      teamsService.getActiveTeamOrFail.mockResolvedValue(
        team({
          group: {
            id: 5,
            groupName: 'C',
            tournament: tournament(
              20,
              TournamentStatus.IN_PROGRESS,
              'Liga 2026',
            ),
          },
        }),
      );

      await expect(service.assignTeam(1, { teamId: 7 })).rejects.toThrow(
        'El equipo ya está en el grupo C del torneo Liga 2026',
      );
      expect(teamRepository.update).not.toHaveBeenCalled();
    });

    it('ya está en este mismo grupo', async () => {
      teamsService.getActiveTeamOrFail.mockResolvedValue(
        team({
          group: { id: 1, groupName: 'A', tournament: GROUP_A.tournament },
        }),
      );

      await expect(service.assignTeam(1, { teamId: 7 })).rejects.toThrow(
        'El equipo ya está en el grupo A del torneo Copa Abierta',
      );
    });

    it('reasigna si su grupo actual es de un torneo cerrado', async () => {
      teamsService.getActiveTeamOrFail.mockResolvedValue(
        team({
          group: {
            id: 5,
            groupName: 'C',
            tournament: tournament(20, TournamentStatus.FINISHED),
          },
        }),
      );

      await expect(service.assignTeam(1, { teamId: 7 })).resolves.toEqual([]);
      expect(teamRepository.update).toHaveBeenCalledWith(7, {
        group: { id: 1 },
      });
    });

    it('verifica que el torneo del grupo sea editable', async () => {
      teamsService.getActiveTeamOrFail.mockResolvedValue(team());

      await service.assignTeam(1, { teamId: 7 });
      expect(phaseRules.assertTournamentEditable).toHaveBeenCalledWith(
        GROUP_A.tournament,
      );
    });
  });

  describe('removeTeam', () => {
    it('404 si el equipo no está en el grupo', async () => {
      teamRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.removeTeam(1, 7)).rejects.toThrow(
        'El equipo #7 no está en el grupo A',
      );
    });

    it('no retira si el equipo ya jugó partidos en el grupo', async () => {
      teamRepository.findOne.mockResolvedValueOnce(team());
      phasesRepository.countTeamMatchesInPhase.mockResolvedValueOnce(2);

      await expect(service.removeTeam(1, 7)).rejects.toThrow(
        'No se puede retirar el equipo porque ya tiene 2 partidos en el grupo A',
      );
      expect(teamRepository.update).not.toHaveBeenCalled();
    });

    it('retira el equipo dejando group en null', async () => {
      teamRepository.findOne.mockResolvedValueOnce(team());

      await expect(service.removeTeam(1, 7)).resolves.toEqual({
        message: 'Equipo #7 retirado del grupo A',
      });
      expect(teamRepository.update).toHaveBeenCalledWith(7, { group: null });
    });
  });
});
