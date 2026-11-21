import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Goal } from '../entities/goal.entity';
import { CountRow, toCountMap } from '../../common/database/query.util';

export interface GoalFilters {
  matchId?: number;
  playerId?: number;
  tournamentId?: number;
}

/**
 * Consultas optimizadas de anotaciones (HU-GC-07) sin consultas N+1.
 */
@Injectable()
export class GoalsRepository {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
  ) {}

  private withRelations(): SelectQueryBuilder<Goal> {
    return this.goalRepository
      .createQueryBuilder('goal')
      .innerJoinAndSelect('goal.match', 'match')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .innerJoinAndSelect('goal.player', 'player');
  }

  findByFilters(filters: GoalFilters): Promise<Goal[]> {
    const qb = this.withRelations()
      .orderBy('goal.minute', 'ASC')
      .addOrderBy('goal.id', 'ASC');

    if (filters.matchId !== undefined) {
      qb.andWhere('match.id = :matchId', { matchId: filters.matchId });
    }
    if (filters.playerId !== undefined) {
      qb.andWhere('player.id = :playerId', { playerId: filters.playerId });
    }
    if (filters.tournamentId !== undefined) {
      qb.innerJoin('match.phase', 'phase').andWhere(
        'phase.tournament_id = :tournamentId',
        { tournamentId: filters.tournamentId },
      );
    }

    return qb.getMany();
  }

  findOneWithRelations(id: number): Promise<Goal | null> {
    return this.withRelations().where('goal.id = :id', { id }).getOne();
  }

  findByMatchId(matchId: number): Promise<Goal[]> {
    return this.findByFilters({ matchId });
  }

  countByMatch(matchId: number): Promise<number> {
    return this.goalRepository.count({ where: { match: { id: matchId } } });
  }

  countByPlayer(playerId: number): Promise<number> {
    return this.goalRepository.count({ where: { player: { id: playerId } } });
  }

  async countByMatchIds(matchIds: number[]): Promise<Map<number, number>> {
    if (matchIds.length === 0) return new Map();

    const rows = await this.goalRepository
      .createQueryBuilder('goal')
      .select('goal.match_id', 'id')
      .addSelect('COUNT(goal.id)', 'total')
      .where('goal.match_id IN (:...matchIds)', { matchIds })
      .groupBy('goal.match_id')
      .getRawMany<CountRow>();

    return toCountMap(rows);
  }

  async sumPointsByMatchId(matchId: number): Promise<number> {
    const row = await this.goalRepository
      .createQueryBuilder('goal')
      .select('COALESCE(SUM(goal.points), 0)', 'total')
      .where('goal.match_id = :matchId', { matchId })
      .getRawOne<{ total: string | number }>();

    return Number(row?.total ?? 0);
  }
}
