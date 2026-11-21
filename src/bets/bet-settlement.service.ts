import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type {
  BetSettlementNotification,
  BetSettlementSummary,
  IBetSettlementPort,
  MatchSettlementInput,
} from '../common/contracts';
import { BetNotifier } from './bet-notifier';
import { BetStatus } from './enums/bet-status.enum';
import {
  BET_SELECTION_LABELS,
  BetRulesPolicy,
} from './policies/bet-rules.policy';
import { BetsRepository } from './repositories/bets.repository';

/**
 * Implementación del contrato de liquidación automática de apuestas (HU-GC-11).
 * Opera en lote sobre SQL sin ciclos N+1 y respeta la cuota fija registrada.
 */
@Injectable()
export class BetSettlementService implements IBetSettlementPort {
  constructor(
    private readonly betsRepository: BetsRepository,
    private readonly betNotifier: BetNotifier,
  ) {}

  async settleForMatch(
    input: MatchSettlementInput,
    manager?: EntityManager,
  ): Promise<BetSettlementSummary> {
    const winningSelection = BetRulesPolicy.resolveWinningSelection(
      input.homeScore,
      input.awayScore,
    );
    const pendingBets =
      await this.betsRepository.findPendingByMatchForSettlement(
        input.matchId,
        manager,
      );

    if (pendingBets.length === 0) {
      return this.emptySummary(input.matchId);
    }

    const settledAt = new Date();
    const note =
      `Resultado oficial ${input.homeScore} - ${input.awayScore} ` +
      `(${BET_SELECTION_LABELS[winningSelection]})`;

    const affected = await this.betsRepository.settlePendingByMatch(
      input.matchId,
      winningSelection,
      settledAt,
      note,
      manager,
    );
    if (affected === 0) {
      return this.emptySummary(input.matchId);
    }

    let wonCount = 0;
    let lostCount = 0;
    let totalPayout = 0;
    const notifications: BetSettlementNotification[] = [];

    for (const bet of pendingBets) {
      const amount = Number(bet.amount);
      const odds = Number(bet.odds);
      const isWinner = bet.selection === winningSelection;
      const finalStatus = isWinner ? BetStatus.WON : BetStatus.LOST;
      const payout = BetRulesPolicy.calculatePayout(amount, odds, finalStatus);

      if (isWinner) {
        wonCount += 1;
      } else {
        lostCount += 1;
      }
      totalPayout += payout;

      notifications.push({
        email: bet.fan.email,
        matchLabel: `${bet.match.homeTeam.name} vs ${bet.match.awayTeam.name}`,
        selection: bet.selection,
        amount,
        odds,
        finalStatus,
        payout,
        note,
      });
    }

    return {
      matchId: input.matchId,
      settledCount: affected,
      wonCount,
      lostCount,
      voidedCount: 0,
      totalPayout: BetRulesPolicy.roundCurrency(totalPayout),
      pendingNotifications: notifications,
    };
  }

  async cancelForMatch(
    matchId: number,
    reason = 'Partido cancelado',
    manager?: EntityManager,
  ): Promise<BetSettlementSummary> {
    const pendingBets =
      await this.betsRepository.findPendingByMatchForSettlement(
        matchId,
        manager,
      );

    if (pendingBets.length === 0) {
      return this.emptySummary(matchId);
    }

    const settledAt = new Date();
    const note = reason.trim() || 'Partido cancelado';

    const affected = await this.betsRepository.voidPendingByMatch(
      matchId,
      settledAt,
      note,
      manager,
    );
    if (affected === 0) {
      return this.emptySummary(matchId);
    }

    let totalPayout = 0;
    const notifications: BetSettlementNotification[] = [];

    for (const bet of pendingBets) {
      const amount = Number(bet.amount);
      const odds = Number(bet.odds);
      const payout = BetRulesPolicy.calculatePayout(
        amount,
        odds,
        BetStatus.VOID,
      );
      totalPayout += payout;

      notifications.push({
        email: bet.fan.email,
        matchLabel: `${bet.match.homeTeam.name} vs ${bet.match.awayTeam.name}`,
        selection: bet.selection,
        amount,
        odds,
        finalStatus: BetStatus.VOID,
        payout,
        note,
      });
    }

    return {
      matchId,
      settledCount: affected,
      wonCount: 0,
      lostCount: 0,
      voidedCount: affected,
      totalPayout: BetRulesPolicy.roundCurrency(totalPayout),
      pendingNotifications: notifications,
    };
  }

  async notifySettlementBatch(
    notifications: readonly BetSettlementNotification[],
  ): Promise<void> {
    await this.betNotifier.notifySettlementBatch(notifications);
  }

  private emptySummary(matchId: number): BetSettlementSummary {
    return {
      matchId,
      settledCount: 0,
      wonCount: 0,
      lostCount: 0,
      voidedCount: 0,
      totalPayout: 0,
      pendingNotifications: [],
    };
  }
}

