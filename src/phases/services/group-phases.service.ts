import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { GroupPhase } from '../entities/group-phase.entity';
import { Team } from '../../teams/entities/team.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';
import { TournamentsService } from '../../tournaments/tournaments.service';
import { PhasesRepository } from '../repositories/phases.repository';
import {
  CLOSED_TOURNAMENT_STATUSES,
  PhaseRulesService,
} from './phase-rules.service';
import { GroupPhaseMapper } from '../mappers/group-phase.mapper';
import { CreateGroupPhaseDto } from '../dto/create-group-phase.dto';
import { UpdateGroupPhaseDto } from '../dto/update-group-phase.dto';
import { GroupPhaseQueryDto } from '../dto/group-phase-query.dto';
import { GroupPhaseResponseDto } from '../dto/group-phase-response.dto';
import { GroupTeamResponseDto } from '../dto/group-team-response.dto';
import { AssignGroupTeamDto } from '../dto/assign-group-team.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../../common/exceptions';

// Datos que comparten todos los grupos de una misma fase (torneo + order).
interface SharedPhaseValues {
  name: string;
  startDate: string | null;
  endDate: string | null;
}

@Injectable()
export class GroupPhasesService {
  constructor(
    @InjectRepository(GroupPhase)
    private readonly groupPhaseRepository: Repository<GroupPhase>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    private readonly phasesRepository: PhasesRepository,
    private readonly phaseRules: PhaseRulesService,
    private readonly tournamentsService: TournamentsService,
  ) {}

  async findAll(query: GroupPhaseQueryDto): Promise<GroupPhaseResponseDto[]> {
    const groups = await this.phasesRepository.findGroupsByFilters(query);
    const ids = groups.map((g) => g.id);
    const [teams, matches] = await Promise.all([
      this.phasesRepository.countTeamsByGroupIds(ids),
      this.phasesRepository.countMatchesByPhaseIds(ids),
    ]);
    const counts = new Map(
      ids.map((id) => [
        id,
        { teamsCount: teams.get(id) ?? 0, matchesCount: matches.get(id) ?? 0 },
      ]),
    );
    return GroupPhaseMapper.toResponseDtoList(groups, counts);
  }

  async findOne(id: number): Promise<GroupPhaseResponseDto> {
    const group = await this.getGroupOrFail(id);
    const [teamsCount, matchesCount] = await Promise.all([
      this.phasesRepository.countTeams(id),
      this.phasesRepository.countMatches(id),
    ]);
    return GroupPhaseMapper.toResponseDto(group, { teamsCount, matchesCount });
  }

  async getGroupOrFail(id: number): Promise<GroupPhase> {
    const group = await this.groupPhaseRepository.findOne({
      where: { id },
      relations: { tournament: true },
    });
    if (!group) throw ResourceNotFoundException.of('Grupo', id);
    return group;
  }

  async create(dto: CreateGroupPhaseDto): Promise<GroupPhaseResponseDto> {
    const tournament = await this.tournamentsService.getTournamentOrFail(
      dto.tournamentId,
    );
    this.phaseRules.assertTournamentEditable(tournament);
    await this.phaseRules.assertOrderType(tournament.id, dto.order, 'GROUP');
    await this.assertOrderBeforeFinals(tournament.id, dto.order);
    await this.assertGroupNameAvailable(
      tournament.id,
      dto.order,
      dto.groupName,
    );

    const shared: SharedPhaseValues = {
      name: dto.name,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
    };
    const siblings = await this.phasesRepository.findGroupsInOrder(
      tournament.id,
      dto.order,
    );
    this.assertMatchesSiblings(siblings, shared, dto.order);
    this.phaseRules.assertDatesInsideTournament(
      shared.startDate,
      shared.endDate,
      tournament,
    );

    const saved = await this.groupPhaseRepository.save(
      GroupPhaseMapper.toEntity(dto, tournament),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateGroupPhaseDto,
  ): Promise<GroupPhaseResponseDto> {
    const group = await this.getGroupOrFail(id);
    const tournament = group.tournament;
    this.phaseRules.assertTournamentEditable(tournament);

    const finalOrder = dto.order ?? group.order;
    const orderChanges = finalOrder !== group.order;
    const finalGroupName = dto.groupName ?? group.groupName;
    if (orderChanges || finalGroupName !== group.groupName) {
      await this.assertGroupNameAvailable(
        tournament.id,
        finalOrder,
        finalGroupName,
        id,
      );
    }

    const current = this.sharedValuesOf(group);
    const shared: SharedPhaseValues = {
      name: dto.name ?? current.name,
      startDate: dto.startDate !== undefined ? dto.startDate : current.startDate,
      endDate: dto.endDate !== undefined ? dto.endDate : current.endDate,
    };

    // Si cambia de fase, debe encajar con los grupos del nuevo order.
    if (orderChanges) {
      await this.phaseRules.assertOrderType(
        tournament.id,
        finalOrder,
        'GROUP',
        id,
      );
      await this.assertOrderBeforeFinals(tournament.id, finalOrder);
      const newSiblings = await this.phasesRepository.findGroupsInOrder(
        tournament.id,
        finalOrder,
        id,
      );
      this.assertMatchesSiblings(newSiblings, shared, finalOrder);
    }
    this.phaseRules.assertDatesInsideTournament(
      shared.startDate,
      shared.endDate,
      tournament,
    );

    // Sin cambio de order, nombre y fechas se aplican a toda la fase.
    const sharedChanges =
      !orderChanges &&
      (shared.name !== current.name ||
        shared.startDate !== current.startDate ||
        shared.endDate !== current.endDate);

    GroupPhaseMapper.mergeEntity(group, dto);

    await this.groupPhaseRepository.manager.transaction(async (manager) => {
      await manager.save(group);
      if (!sharedChanges) return;

      const siblings = await manager.find(GroupPhase, {
        where: {
          tournament: { id: tournament.id },
          order: finalOrder,
          id: Not(id),
        },
      });
      for (const sibling of siblings) {
        sibling.name = shared.name;
        sibling.startDate = shared.startDate as string;
        sibling.endDate = shared.endDate as string;
      }
      if (siblings.length > 0) await manager.save(siblings);
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const group = await this.getGroupOrFail(id);
    this.phaseRules.assertTournamentEditable(group.tournament);
    await this.phaseRules.assertNoMatches(id, `el grupo ${group.groupName}`);

    const teams = await this.phasesRepository.countTeams(id);
    if (teams > 0) {
      throw new BusinessRuleException(
        teams === 1
          ? 'Retire primero el equipo del grupo'
          : `Retire primero los ${teams} equipos del grupo`,
      );
    }

    await this.groupPhaseRepository.remove(group);
    return { message: `Grupo #${id} eliminado correctamente` };
  }

  // ---- Equipos del grupo ----

  async findTeams(id: number): Promise<GroupTeamResponseDto[]> {
    await this.getGroupOrFail(id);
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
    const group = await this.getGroupOrFail(id);
    const tournament = group.tournament;

    const team = await this.teamRepository.findOne({
      where: { id: dto.teamId },
      relations: { group: { tournament: true } },
    });
    if (!team) throw ResourceNotFoundException.of('Equipo', dto.teamId);
    if (!team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El equipo está inactivo',
      );
    }

    const registered = await this.registrationRepository.exists({
      where: {
        tournament: { id: tournament.id },
        team: { id: team.id },
        status: RegistrationStatus.ACTIVE,
      },
    });
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
        !CLOSED_TOURNAMENT_STATUSES.includes(currentGroup.tournament.status))
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
    const group = await this.getGroupOrFail(id);
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

  // ---- Reglas propias de los grupos ----

  private async assertGroupNameAvailable(
    tournamentId: number,
    order: number,
    groupName: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.phasesRepository.findGroupByName(
      tournamentId,
      order,
      groupName,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe el grupo ${groupName} en esa fase`,
      );
    }
  }

  // Los grupos van antes que todas las fases finales del torneo.
  private async assertOrderBeforeFinals(
    tournamentId: number,
    order: number,
  ): Promise<void> {
    // Vienen ordenadas por order ASC: la primera es la de menor order.
    const [firstFinal] =
      await this.phasesRepository.findFinalsByTournament(tournamentId);
    if (!firstFinal || order < firstFinal.order) return;
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El orden ${order} no es válido para una fase de grupos: debe ser ` +
        `menor que ${firstFinal.order}, el orden de ${firstFinal.round} ` +
        `(orden ${firstFinal.order})`,
    );
  }

  // Los grupos de una misma fase comparten nombre y fechas.
  private assertMatchesSiblings(
    siblings: GroupPhase[],
    values: SharedPhaseValues,
    order: number,
  ): void {
    if (siblings.length === 0) return;
    const expected = this.sharedValuesOf(siblings[0]);
    if (
      values.name === expected.name &&
      values.startDate === expected.startDate &&
      values.endDate === expected.endDate
    ) {
      return;
    }
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `Los grupos del orden ${order} forman una sola fase y deben compartir ` +
        `nombre y fechas. Valores esperados: name "${expected.name}", ` +
        `startDate ${expected.startDate ?? 'null'}, ` +
        `endDate ${expected.endDate ?? 'null'}`,
    );
  }

  private sharedValuesOf(group: GroupPhase): SharedPhaseValues {
    return {
      name: group.name,
      startDate: group.startDate ?? null,
      endDate: group.endDate ?? null,
    };
  }
}
