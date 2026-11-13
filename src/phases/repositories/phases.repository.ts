import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { GroupPhase } from '../entities/group-phase.entity';
import { FinalPhase } from '../entities/final-phase.entity';
import { FinalRound } from '../enums/final-round.enum';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { GroupPhaseQueryDto } from '../dto/group-phase-query.dto';
import { FinalPhaseQueryDto } from '../dto/final-phase-query.dto';

interface CountRow {
  id: number | string;
  total: number | string;
}

const toCountMap = (rows: CountRow[]): Map<number, number> =>
  new Map(rows.map((row) => [Number(row.id), Number(row.total)]));

// Consultas propias de grupos y fases finales (herencia en tabla `phases`).
@Injectable()
export class PhasesRepository {
  constructor(
    @InjectRepository(GroupPhase)
    private readonly groupPhaseRepository: Repository<GroupPhase>,
    @InjectRepository(FinalPhase)
    private readonly finalPhaseRepository: Repository<FinalPhase>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  findGroupsByFilters(query: GroupPhaseQueryDto): Promise<GroupPhase[]> {
    const qb = this.groupPhaseRepository
      .createQueryBuilder('groupPhase')
      .innerJoinAndSelect('groupPhase.tournament', 'tournament')
      .orderBy('tournament.id', 'ASC')
      .addOrderBy('groupPhase.order', 'ASC')
      .addOrderBy('groupPhase.groupName', 'ASC');

    if (query.tournamentId !== undefined) {
      qb.andWhere('tournament.id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    }
    if (query.order !== undefined) {
      qb.andWhere('groupPhase.order = :order', { order: query.order });
    }

    return qb.getMany();
  }

  findFinalsByFilters(query: FinalPhaseQueryDto): Promise<FinalPhase[]> {
    const qb = this.finalPhaseRepository
      .createQueryBuilder('finalPhase')
      .innerJoinAndSelect('finalPhase.tournament', 'tournament')
      .orderBy('tournament.id', 'ASC')
      .addOrderBy('finalPhase.order', 'ASC')
      .addOrderBy('finalPhase.id', 'ASC');

    if (query.tournamentId !== undefined) {
      qb.andWhere('tournament.id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    }

    return qb.getMany();
  }

  // Grupos de la misma fase (mismo torneo + order), sin `excludeId`.
  findGroupsInOrder(
    tournamentId: number,
    order: number,
    excludeId?: number,
  ): Promise<GroupPhase[]> {
    const where: FindOptionsWhere<GroupPhase> = {
      tournament: { id: tournamentId },
      order,
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    return this.groupPhaseRepository.find({
      where,
      order: { groupName: 'ASC' },
    });
  }

  findGroupByName(
    tournamentId: number,
    order: number,
    groupName: string,
    excludeId?: number,
  ): Promise<GroupPhase | null> {
    const where: FindOptionsWhere<GroupPhase> = {
      tournament: { id: tournamentId },
      order,
      groupName,
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    return this.groupPhaseRepository.findOne({ where });
  }

  findFinalByRound(
    tournamentId: number,
    round: FinalRound,
    excludeId?: number,
  ): Promise<FinalPhase | null> {
    const where: FindOptionsWhere<FinalPhase> = {
      tournament: { id: tournamentId },
      round,
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    return this.finalPhaseRepository.findOne({ where });
  }

  // Fases finales del torneo, sin `excludeId`.
  findFinalsByTournament(
    tournamentId: number,
    excludeId?: number,
  ): Promise<FinalPhase[]> {
    const where: FindOptionsWhere<FinalPhase> = {
      tournament: { id: tournamentId },
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    return this.finalPhaseRepository.find({ where, order: { order: 'ASC' } });
  }

  // Mayor order de los grupos del torneo; null si no tiene grupos.
  async findMaxGroupOrder(tournamentId: number): Promise<number | null> {
    const row = await this.groupPhaseRepository
      .createQueryBuilder('groupPhase')
      .select('MAX(groupPhase.order)', 'maxOrder')
      .where('groupPhase.tournament_id = :tournamentId', { tournamentId })
      .getRawOne<{ maxOrder: number | string | null }>();
    return row?.maxOrder != null ? Number(row.maxOrder) : null;
  }

  countGroupsInOrder(
    tournamentId: number,
    order: number,
    excludeId?: number,
  ): Promise<number> {
    const where: FindOptionsWhere<GroupPhase> = {
      tournament: { id: tournamentId },
      order,
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    return this.groupPhaseRepository.count({ where });
  }

  countFinalsInOrder(
    tournamentId: number,
    order: number,
    excludeId?: number,
  ): Promise<number> {
    const where: FindOptionsWhere<FinalPhase> = {
      tournament: { id: tournamentId },
      order,
    };
    if (excludeId !== undefined) where.id = Not(excludeId);
    return this.finalPhaseRepository.count({ where });
  }

  countMatches(phaseId: number): Promise<number> {
    return this.matchRepository.count({ where: { phase: { id: phaseId } } });
  }

  countTeams(groupId: number): Promise<number> {
    return this.teamRepository.count({ where: { group: { id: groupId } } });
  }

  // Partidos de la fase en los que el equipo juega como local o visitante.
  countTeamMatchesInPhase(teamId: number, phaseId: number): Promise<number> {
    return this.matchRepository.count({
      where: [
        { phase: { id: phaseId }, homeTeam: { id: teamId } },
        { phase: { id: phaseId }, awayTeam: { id: teamId } },
      ],
    });
  }

  // Equipos por grupo en una sola consulta (para el listado).
  async countTeamsByGroupIds(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.teamRepository
      .createQueryBuilder('team')
      .select('team.group_id', 'id')
      .addSelect('COUNT(*)', 'total')
      .where('team.group_id IN (:...ids)', { ids })
      .groupBy('team.group_id')
      .getRawMany<CountRow>();
    return toCountMap(rows);
  }

  // Partidos por fase en una sola consulta (para el listado).
  async countMatchesByPhaseIds(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.matchRepository
      .createQueryBuilder('match')
      .select('match.phase_id', 'id')
      .addSelect('COUNT(*)', 'total')
      .where('match.phase_id IN (:...ids)', { ids })
      .groupBy('match.phase_id')
      .getRawMany<CountRow>();
    return toCountMap(rows);
  }
}
