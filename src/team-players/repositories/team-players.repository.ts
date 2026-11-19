import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamPlayer } from '../entities/team-player.entity';
import { TeamPlayerQueryDto } from '../dto/team-player-query.dto';
import { contractStageCondition } from './contract-stage.sql';

export interface ContractPeriodFilter {
  teamId: number;
  playerId: number;
  startDate: string;
  endDate: string;
  // Al editar un contrato no se compara consigo mismo
  excludeId?: number;
}

// Consultas propias del módulo equipo-jugador.
@Injectable()
export class TeamPlayersRepository {
  constructor(
    @InjectRepository(TeamPlayer)
    private readonly teamPlayerRepository: Repository<TeamPlayer>,
  ) {}

  // Vigentes primero; dentro de cada estado, el más reciente primero.
  findByFilters(query: TeamPlayerQueryDto): Promise<TeamPlayer[]> {
    const qb = this.teamPlayerRepository
      .createQueryBuilder('teamPlayer')
      .innerJoinAndSelect('teamPlayer.team', 'team')
      .innerJoinAndSelect('teamPlayer.player', 'player')
      .orderBy('teamPlayer.status', 'ASC')
      .addOrderBy('teamPlayer.startDate', 'DESC')
      .addOrderBy('player.fullName', 'ASC');

    if (query.teamId !== undefined) {
      qb.andWhere('team.id = :teamId', { teamId: query.teamId });
    }
    if (query.playerId !== undefined) {
      qb.andWhere('player.id = :playerId', { playerId: query.playerId });
    }
    if (query.status !== undefined) {
      qb.andWhere('teamPlayer.status = :status', { status: query.status });
    }
    if (query.stage !== undefined) {
      const { sql, params } = contractStageCondition('teamPlayer', query.stage);
      qb.andWhere(sql, params);
    }

    return qb.getMany();
  }

  /**
   * Contrato del mismo jugador con el mismo equipo cuyo periodo se cruza con
   * el dado. Un contrato retirado termina en release_date (ContractPeriodPolicy).
   */
  findOverlapping(filter: ContractPeriodFilter): Promise<TeamPlayer | null> {
    const qb = this.teamPlayerRepository
      .createQueryBuilder('teamPlayer')
      .where('teamPlayer.team_id = :teamId', { teamId: filter.teamId })
      .andWhere('teamPlayer.player_id = :playerId', {
        playerId: filter.playerId,
      })
      .andWhere('teamPlayer.startDate <= :endDate', {
        endDate: filter.endDate,
      })
      .andWhere(
        'COALESCE(teamPlayer.releaseDate, teamPlayer.endDate) >= :startDate',
        { startDate: filter.startDate },
      )
      .orderBy('teamPlayer.startDate', 'ASC');

    if (filter.excludeId !== undefined) {
      qb.andWhere('teamPlayer.id <> :excludeId', {
        excludeId: filter.excludeId,
      });
    }

    return qb.getOne();
  }
}
