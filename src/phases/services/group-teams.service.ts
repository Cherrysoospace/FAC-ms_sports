import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { TeamsService } from '../../teams/teams.service';
import { RegistrationsService } from '../../registrations/registrations.service';
import { TournamentStatusPolicy } from '../../tournaments/policies/tournament-status.policy';
import { PhasesRepository } from '../repositories/phases.repository';
import { PhaseRulesService } from './phase-rules.service';
import { GroupPhasesService } from './group-phases.service';
import { GroupPhaseMapper } from '../mappers/group-phase.mapper';
import { GroupTeamResponseDto } from '../dto/group-team-response.dto';
import { AssignGroupTeamDto } from '../dto/assign-group-team.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../../common/exceptions';

/**
 * Asignar y retirar equipos de un grupo (Grupo 1 — n Equipo).
 * Las reglas de equipo e inscripción las deciden sus módulos dueños
 * (TeamsService, RegistrationsService). La escritura de Team.group se queda
 * aquí porque el grupo es dueño de la asignación.
 */
@Injectable()
export class GroupTeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly groupPhasesService: GroupPhasesService,
    private readonly phasesRepository: PhasesRepository,
    private readonly phaseRules: PhaseRulesService,
    private readonly teamsService: TeamsService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  async findTeams(id: number): Promise<GroupTeamResponseDto[]> {
    await this.groupPhasesService.getGroupOrFail(id);
    const teams = await this.teamRepository.find({
      where: { group: { id } },
      order: { name: 'ASC' },
    });
    return GroupPhaseMapper.toTeamResponseDtoList(teams);
  }

  async assignTeam(
    id: number,
    dto: AssignGroupTeamDto,
  ): Promise<GroupTeamResponseDto[]> {
    const group = await this.groupPhasesService.getGroupOrFail(id);
    const tournament = group.tournament;

    // Carga también el grupo actual del equipo y su torneo.
    const team = await this.teamsService.getActiveTeamOrFail(dto.teamId);

    const registered = await this.registrationsService.isTeamActivelyRegistered(
      tournament.id,
      team.id,
    );
    if (!registered) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El equipo no está inscrito en el torneo',
      );
    }

    this.phaseRules.assertTournamentEditable(tournament);

    // Un equipo está en un solo grupo a la vez; se libera si el torneo de su
    // grupo actual ya terminó o se canceló.
    const currentGroup = team.group;
    if (
      currentGroup &&
      (currentGroup.id === group.id ||
        !TournamentStatusPolicy.isClosed(currentGroup.tournament.status))
    ) {
      throw new BusinessRuleException(
        `El equipo ya está en el grupo ${currentGroup.groupName} del torneo ` +
          `${currentGroup.tournament.name}`,
      );
    }

    await this.teamRepository.update(team.id, { group: { id: group.id } });
    return this.findTeams(id);
  }

  async removeTeam(id: number, teamId: number): Promise<{ message: string }> {
    const group = await this.groupPhasesService.getGroupOrFail(id);
    this.phaseRules.assertTournamentEditable(group.tournament);

    const team = await this.teamRepository.findOne({
      where: { id: teamId, group: { id } },
    });
    if (!team) {
      throw new ResourceNotFoundException(
        `El equipo #${teamId} no está en el grupo ${group.groupName}`,
      );
    }

    const matches = await this.phasesRepository.countTeamMatchesInPhase(
      teamId,
      id,
    );
    if (matches > 0) {
      throw new BusinessRuleException(
        `No se puede retirar el equipo porque ya tiene ${matches} ` +
          `${matches === 1 ? 'partido' : 'partidos'} en el grupo ` +
          group.groupName,
      );
    }

    await this.teamRepository.update(teamId, { group: null });
    return {
      message: `Equipo #${teamId} retirado del grupo ${group.groupName}`,
    };
  }
}
