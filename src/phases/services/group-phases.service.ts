import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { GroupPhase } from '../entities/group-phase.entity';
import { TournamentsService } from '../../tournaments/tournaments.service';
import { PhasesRepository } from '../repositories/phases.repository';
import { PhaseRulesService } from './phase-rules.service';
import {
  GroupPhaseConsistencyPolicy,
  SharedPhaseValues,
} from '../policies/group-phase-consistency.policy';
import { GroupPhaseMapper } from '../mappers/group-phase.mapper';
import { CreateGroupPhaseDto } from '../dto/create-group-phase.dto';
import { UpdateGroupPhaseDto } from '../dto/update-group-phase.dto';
import { GroupPhaseQueryDto } from '../dto/group-phase-query.dto';
import { GroupPhaseResponseDto } from '../dto/group-phase-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../../common/exceptions';

/**
 * CRUD de grupos. La coherencia de la fase (grupos hermanos con el mismo
 * nombre y fechas) la decide GroupPhaseConsistencyPolicy, y los equipos del
 * grupo los gestiona GroupTeamsService.
 */
@Injectable()
export class GroupPhasesService {
  constructor(
    @InjectRepository(GroupPhase)
    private readonly groupPhaseRepository: Repository<GroupPhase>,
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

  // Lo usa GroupTeamsService. Carga el torneo del grupo.
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
    GroupPhaseConsistencyPolicy.assertMatchesSiblings(
      siblings,
      shared,
      dto.order,
    );
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

    const current = GroupPhaseConsistencyPolicy.sharedValuesOf(group);
    const shared = GroupPhaseConsistencyPolicy.mergeUpdate(current, dto);

    // Si cambia de fase, debe encajar con los grupos del nuevo order.
    if (orderChanges) {
      await this.assertFitsNewOrder(tournament.id, finalOrder, id, shared);
    }
    this.phaseRules.assertDatesInsideTournament(
      shared.startDate,
      shared.endDate,
      tournament,
    );

    // Sin cambio de order, nombre y fechas se aplican a toda la fase.
    const propagate = GroupPhaseConsistencyPolicy.valuesToPropagate(
      current,
      shared,
      orderChanges,
    );

    GroupPhaseMapper.mergeEntity(group, dto);

    await this.groupPhaseRepository.manager.transaction(async (manager) => {
      await manager.save(group);
      if (!propagate) return;

      const siblings = await manager.find(GroupPhase, {
        where: {
          tournament: { id: tournament.id },
          order: finalOrder,
          id: Not(id),
        },
      });
      GroupPhaseConsistencyPolicy.applyTo(siblings, propagate);
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

  // ---- Reglas propias de los grupos ----

  // Mismas validaciones que al crear, contra los grupos del nuevo order.
  private async assertFitsNewOrder(
    tournamentId: number,
    order: number,
    groupId: number,
    shared: SharedPhaseValues,
  ): Promise<void> {
    await this.phaseRules.assertOrderType(
      tournamentId,
      order,
      'GROUP',
      groupId,
    );
    await this.assertOrderBeforeFinals(tournamentId, order);
    const newSiblings = await this.phasesRepository.findGroupsInOrder(
      tournamentId,
      order,
      groupId,
    );
    GroupPhaseConsistencyPolicy.assertMatchesSiblings(
      newSiblings,
      shared,
      order,
    );
  }

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
}
