import type { EntityManager } from 'typeorm';

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
 * Resumen devuelto tras liquidar o anular en lote las apuestas de un partido.
 */
export interface BetSettlementSummary {
  matchId: number;
  settledCount: number;
  wonCount: number;
  lostCount: number;
  voidedCount: number;
  totalPayout: number;
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
}

