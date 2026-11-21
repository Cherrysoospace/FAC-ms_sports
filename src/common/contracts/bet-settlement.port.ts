import type { EntityManager } from 'typeorm';
import type { BetSelection } from '../../bets/enums/bet-selection.enum';
import type { BetStatus } from '../../bets/enums/bet-status.enum';

/**
 * Token de inyección para desacoplar `matches` de la implementación de liquidación
 * de apuestas en `bets` (DIP).
 */
export const BET_SETTLEMENT_PORT = Symbol('BET_SETTLEMENT_PORT');

/**
 * Resultado definitivo de un partido necesario para liquidar sus apuestas pendientes.
 */
export interface MatchSettlementInput {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
}

/**
 * Correo de liquidación pendiente de enviarse fuera de la transacción SQL.
 */
export interface BetSettlementNotification {
  email: string;
  matchLabel: string;
  selection: BetSelection;
  amount: number;
  odds: number;
  finalStatus: BetStatus;
  payout: number;
  note: string;
}

/**
 * Resumen devuelto tras liquidar o anular en lote las apuestas de un partido.
 */
export interface BetSettlementSummary {
  matchId: number;
  settledCount: number;
  wonCount: number;
  lostCount: number;
  voidedCount: number;
  totalPayout: number;
  pendingNotifications: BetSettlementNotification[];
}

/**
 * Puerto de liquidación automática de apuestas (HU-GC-11).
 * `MatchesService` depende de esta interfaz y no de `BetsService` ni `BetsRepository`.
 */
export interface IBetSettlementPort {
  settleForMatch(
    input: MatchSettlementInput,
    manager?: EntityManager,
  ): Promise<BetSettlementSummary>;

  cancelForMatch(
    matchId: number,
    reason?: string,
    manager?: EntityManager,
  ): Promise<BetSettlementSummary>;

  notifySettlementBatch(
    notifications: readonly BetSettlementNotification[],
  ): Promise<void>;
}

