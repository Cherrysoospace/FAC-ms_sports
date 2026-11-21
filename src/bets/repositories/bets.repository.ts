import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Bet } from '../entities/bet.entity';
import { BetSelection } from '../enums/bet-selection.enum';
import { BetStatus } from '../enums/bet-status.enum';

export interface BetFilters {
  matchId?: number;
  fanId?: number;
  status?: BetStatus;
  tournamentId?: number;
}

export interface BetMatchStatsRow {
  status: BetStatus;
  total: number;
  totalStaked: number;
  totalPayout: number;
}

interface RawMatchStatsRow {
  status: BetStatus;
  total: number | string;
  totalStaked: number | string;
  totalPayout: number | string;
}

interface SqlUpdateResult {
  affectedRows?: number | string;
}

/**
 * Consultas SQL y actualizaciones en lote de apuestas (R17, R26) sin consultas N+1.
 */
@Injectable()
export class BetsRepository {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) {}

  private getRepository(manager?: EntityManager): Repository<Bet> {
    return manager ? manager.getRepository(Bet) : this.betRepository;
  }

  private withRelations(manager?: EntityManager): SelectQueryBuilder<Bet> {
    return this.getRepository(manager)
      .createQueryBuilder('bet')
      .innerJoinAndSelect('bet.match', 'match')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .innerJoinAndSelect('match.venue', 'venue')
      .innerJoinAndSelect('match.phase', 'phase')
      .innerJoinAndSelect('phase.tournament', 'tournament')
      .innerJoinAndSelect('bet.fan', 'fan')
      .innerJoinAndSelect('bet.fanPaymentMethod', 'fanPaymentMethod')
      .innerJoinAndSelect('fanPaymentMethod.paymentMethod', 'paymentMethod');
  }

  findByFilters(filters: BetFilters): Promise<Bet[]> {
    const qb = this.withRelations()
      .orderBy('bet.placedAt', 'DESC')
      .addOrderBy('bet.id', 'DESC');

    if (filters.matchId !== undefined) {
      qb.andWhere('match.id = :matchId', { matchId: filters.matchId });
    }
    if (filters.fanId !== undefined) {
      qb.andWhere('fan.id = :fanId', { fanId: filters.fanId });
    }
    if (filters.status !== undefined) {
      qb.andWhere('bet.status = :status', { status: filters.status });
    }
    if (filters.tournamentId !== undefined) {
      qb.andWhere('tournament.id = :tournamentId', {
        tournamentId: filters.tournamentId,
      });
    }

    return qb.getMany();
  }

  findOneWithRelations(
    id: number,
    manager?: EntityManager,
  ): Promise<Bet | null> {
    return this.withRelations(manager).where('bet.id = :id', { id }).getOne();
  }

  findByMatchAndFan(
    matchId: number,
    fanId: number,
    manager?: EntityManager,
  ): Promise<Bet | null> {
    return this.getRepository(manager).findOne({
      where: { match: { id: matchId }, fan: { id: fanId } },
    });
  }

  findPendingByMatchForSettlement(
    matchId: number,
    manager?: EntityManager,
  ): Promise<Bet[]> {
    return this.getRepository(manager)
      .createQueryBuilder('bet')
      .innerJoinAndSelect('bet.fan', 'fan')
      .innerJoinAndSelect('bet.match', 'match')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .innerJoinAndSelect('bet.fanPaymentMethod', 'fanPaymentMethod')
      .innerJoinAndSelect('fanPaymentMethod.paymentMethod', 'paymentMethod')
      .where('match.id = :matchId', { matchId })
      .andWhere('bet.status = :status', { status: BetStatus.PENDING })
      .orderBy('bet.id', 'ASC')
      .getMany();
  }

  async settlePendingByMatch(
    matchId: number,
    winningSelection: BetSelection,
    settledAt: Date,
    settlementNote: string,
    manager?: EntityManager,
  ): Promise<number> {
    const raw: unknown = await this.getRepository(manager).query(
      'UPDATE bets ' +
        'SET status = CASE WHEN selection = ? THEN ? ELSE ? END, ' +
        'payout = CASE WHEN selection = ? THEN ROUND(amount * odds, 2) ELSE 0.00 END, ' +
        'settled_at = ?, ' +
        'settlement_note = ? ' +
        'WHERE match_id = ? AND status = ?',
      [
        winningSelection,
        BetStatus.WON,
        BetStatus.LOST,
        winningSelection,
        settledAt,
        settlementNote,
        matchId,
        BetStatus.PENDING,
      ],
    );
    return this.extractAffectedRows(raw);
  }

  async voidPendingByMatch(
    matchId: number,
    settledAt: Date,
    settlementNote: string,
    manager?: EntityManager,
  ): Promise<number> {
    const raw: unknown = await this.getRepository(manager).query(
      'UPDATE bets ' +
        'SET status = ?, payout = amount, settled_at = ?, settlement_note = ? ' +
        'WHERE match_id = ? AND status = ?',
      [BetStatus.VOID, settledAt, settlementNote, matchId, BetStatus.PENDING],
    );
    return this.extractAffectedRows(raw);
  }

  async summarizeByMatch(
    matchId: number,
    manager?: EntityManager,
  ): Promise<BetMatchStatsRow[]> {
    const rows = (await this.getRepository(manager).query(
      'SELECT status, COUNT(id) AS total, ' +
        'COALESCE(SUM(amount), 0) AS totalStaked, ' +
        'COALESCE(SUM(payout), 0) AS totalPayout ' +
        'FROM bets WHERE match_id = ? GROUP BY status',
      [matchId],
    )) as RawMatchStatsRow[];

    return rows.map((row) => ({
      status: row.status,
      total: Number(row.total),
      totalStaked: Number(row.totalStaked),
      totalPayout: Number(row.totalPayout),
    }));
  }

  countByMatch(matchId: number): Promise<number> {
    return this.betRepository.count({
      where: { match: { id: matchId } },
    });
  }

  countByFan(fanId: number): Promise<number> {
    return this.betRepository.count({
      where: { fan: { id: fanId } },
    });
  }

  countByFanPaymentMethod(fanPaymentMethodId: number): Promise<number> {
    return this.betRepository.count({
      where: { fanPaymentMethod: { id: fanPaymentMethodId } },
    });
  }

  private extractAffectedRows(raw: unknown): number {
    if (raw && typeof raw === 'object' && 'affectedRows' in raw) {
      return Number((raw as SqlUpdateResult).affectedRows ?? 0);
    }
    return 0;
  }
}

