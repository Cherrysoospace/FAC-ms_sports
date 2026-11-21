import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CountRow,
  escapeLike,
  toCountMap,
} from '../../common/database/query.util';
import { Fan } from '../entities/fan.entity';
import { FanTeam } from '../entities/fan-team.entity';
import { FanPaymentMethod } from '../../payment-methods/entities/fan-payment-method.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Bet } from '../../bets/entities/bet.entity';

export interface FanFilters {
  search?: string;
  active?: boolean;
}

/**
 * Consultas SQL optimizadas del módulo de aficionados sin N+1.
 */
@Injectable()
export class FansRepository {
  constructor(
    @InjectRepository(Fan)
    private readonly fanRepository: Repository<Fan>,
    @InjectRepository(FanTeam)
    private readonly fanTeamRepository: Repository<FanTeam>,
    @InjectRepository(FanPaymentMethod)
    private readonly fanPaymentMethodRepository: Repository<FanPaymentMethod>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) { }

  findByFilters(filters: FanFilters): Promise<Fan[]> {
    const qb = this.fanRepository
      .createQueryBuilder('fan')
      .orderBy('fan.fullName', 'ASC')
      .addOrderBy('fan.id', 'ASC');

    if (filters.active !== undefined) {
      qb.andWhere('fan.active = :active', { active: filters.active });
    }
    if (filters.search) {
      const term = `%${escapeLike(filters.search.trim().toLowerCase())}%`;
      qb.andWhere(
        "(LOWER(fan.fullName) LIKE :term ESCAPE '\\\\' " +
        "OR LOWER(fan.email) LIKE :term ESCAPE '\\\\' " +
        "OR LOWER(fan.documentNumber) LIKE :term ESCAPE '\\\\')",
        { term },
      );
    }

    return qb.getMany();
  }

  findBySecurityUserId(securityUserId: number): Promise<Fan | null> {
    return this.fanRepository.findOne({ where: { securityUserId } });
  }

  findByDocumentNumber(
    documentNumber: string,
    excludeId?: number,
  ): Promise<Fan | null> {
    const qb = this.fanRepository
      .createQueryBuilder('fan')
      .where('LOWER(fan.documentNumber) = LOWER(:documentNumber)', {
        documentNumber,
      });

    if (excludeId !== undefined) {
      qb.andWhere('fan.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  findByEmailIgnoringCase(
    email: string,
    excludeId?: number,
  ): Promise<Fan | null> {
    const qb = this.fanRepository
      .createQueryBuilder('fan')
      .where('LOWER(fan.email) = LOWER(:email)', { email });

    if (excludeId !== undefined) {
      qb.andWhere('fan.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  countFavoriteTeams(fanId: number): Promise<number> {
    return this.fanTeamRepository.count({ where: { fan: { id: fanId } } });
  }

  countPaymentMethods(fanId: number): Promise<number> {
    return this.fanPaymentMethodRepository.count({
      where: { fan: { id: fanId } },
    });
  }

  countTickets(fanId: number): Promise<number> {
    return this.ticketRepository.count({
      where: { fan: { id: fanId } },
    });
  }

  countBets(fanId: number): Promise<number> {
    return this.betRepository.count({
      where: { fan: { id: fanId } },
    });
  }

  async countFavoriteTeamsByFanIds(
    fanIds: number[],
  ): Promise<Map<number, number>> {
    if (fanIds.length === 0) return new Map();

    const rows = await this.fanTeamRepository
      .createQueryBuilder('fanTeam')
      .select('fanTeam.fan_id', 'id')
      .addSelect('COUNT(fanTeam.id)', 'total')
      .where('fanTeam.fan_id IN (:...fanIds)', { fanIds })
      .groupBy('fanTeam.fan_id')
      .getRawMany<CountRow>();

    return toCountMap(rows);
  }
}
