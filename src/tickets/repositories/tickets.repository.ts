import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import type { ITicketCapacityPort } from '../../common/contracts';
import {
  CountRow,
  escapeLike,
  toCountMap,
} from '../../common/database/query.util';
import { Ticket } from '../entities/ticket.entity';

export interface TicketFilters {
  matchId?: number;
  fanId?: number;
  locationId?: number;
  tournamentId?: number;
  code?: string;
}

interface MaxSoldRow {
  maxSold: string | number;
}

/**
 * Consultas SQL optimizadas de boletos (R15, R16) sin consultas N+1.
 */
@Injectable()
export class TicketsRepository implements ITicketCapacityPort {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  private withRelations(): SelectQueryBuilder<Ticket> {
    return this.ticketRepository
      .createQueryBuilder('ticket')
      .innerJoinAndSelect('ticket.match', 'match')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .innerJoinAndSelect('match.venue', 'venue')
      .innerJoinAndSelect('ticket.fan', 'fan')
      .innerJoinAndSelect('ticket.location', 'location');
  }

  findByFilters(filters: TicketFilters): Promise<Ticket[]> {
    const qb = this.withRelations()
      .orderBy('ticket.purchasedAt', 'DESC')
      .addOrderBy('ticket.id', 'DESC');

    if (filters.matchId !== undefined) {
      qb.andWhere('match.id = :matchId', { matchId: filters.matchId });
    }
    if (filters.fanId !== undefined) {
      qb.andWhere('fan.id = :fanId', { fanId: filters.fanId });
    }
    if (filters.locationId !== undefined) {
      qb.andWhere('location.id = :locationId', {
        locationId: filters.locationId,
      });
    }
    if (filters.tournamentId !== undefined) {
      qb.innerJoin('match.phase', 'phase').andWhere(
        'phase.tournament_id = :tournamentId',
        { tournamentId: filters.tournamentId },
      );
    }
    if (filters.code) {
      const term = `%${escapeLike(filters.code.trim().toLowerCase())}%`;
      qb.andWhere("LOWER(ticket.code) LIKE :term ESCAPE '\\\\'", { term });
    }

    return qb.getMany();
  }

  findOneWithRelations(id: number): Promise<Ticket | null> {
    return this.withRelations().where('ticket.id = :id', { id }).getOne();
  }

  findByMatchAndFan(
    matchId: number,
    fanId: number,
    manager?: EntityManager,
  ): Promise<Ticket | null> {
    const repo = manager
      ? manager.getRepository(Ticket)
      : this.ticketRepository;
    return repo.findOne({
      where: { match: { id: matchId }, fan: { id: fanId } },
    });
  }

  async countByMatchGroupedByLocation(
    matchId: number,
  ): Promise<Map<number, number>> {
    const rows = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('ticket.location_id', 'id')
      .addSelect('COUNT(ticket.id)', 'total')
      .where('ticket.match_id = :matchId', { matchId })
      .groupBy('ticket.location_id')
      .getRawMany<CountRow>();

    return toCountMap(rows);
  }

  countByMatchAndLocation(
    matchId: number,
    locationId: number,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager
      ? manager.getRepository(Ticket)
      : this.ticketRepository;
    return repo.count({
      where: { match: { id: matchId }, location: { id: locationId } },
    });
  }

  countByLocationId(locationId: number): Promise<number> {
    return this.ticketRepository.count({
      where: { location: { id: locationId } },
    });
  }

  async maxSoldPerMatchByLocationId(locationId: number): Promise<number> {
    const rows: MaxSoldRow[] = await this.ticketRepository.query(
      'SELECT COALESCE(MAX(sold), 0) AS maxSold ' +
        'FROM (SELECT COUNT(id) AS sold FROM tickets WHERE location_id = ? GROUP BY match_id) AS per_match',
      [locationId],
    );
    return Number(rows[0]?.maxSold ?? 0);
  }

  countByMatch(matchId: number): Promise<number> {
    return this.ticketRepository.count({
      where: { match: { id: matchId } },
    });
  }

  countByFan(fanId: number): Promise<number> {
    return this.ticketRepository.count({
      where: { fan: { id: fanId } },
    });
  }
}
