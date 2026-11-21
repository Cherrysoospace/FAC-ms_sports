import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { MATCH_STATUS_LABELS } from '../../matches/policies/match-rules.policy';
import { BetSelection } from '../enums/bet-selection.enum';
import { BetStatus } from '../enums/bet-status.enum';

export const BET_SELECTION_LABELS: Record<BetSelection, string> = {
  [BetSelection.HOME_WIN]: 'Gana local',
  [BetSelection.DRAW]: 'Empate',
  [BetSelection.AWAY_WIN]: 'Gana visitante',
};

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  [BetStatus.PENDING]: 'pendiente',
  [BetStatus.WON]: 'ganada',
  [BetStatus.LOST]: 'perdida',
  [BetStatus.VOID]: 'anulada',
  [BetStatus.CANCELLED]: 'cancelada',
};

/**
 * Reglas puras de negocio para registro, modificación, cancelación y liquidación
 * de apuestas (HU-GC-11, Anexo 3).
 */
export class BetRulesPolicy {
  static roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static resolveWinningSelection(
    homeScore: number,
    awayScore: number,
  ): BetSelection {
    if (homeScore > awayScore) return BetSelection.HOME_WIN;
    if (awayScore > homeScore) return BetSelection.AWAY_WIN;
    return BetSelection.DRAW;
  }

  static calculatePayout(
    amount: number,
    odds: number,
    status: BetStatus,
  ): number {
    if (status === BetStatus.WON) {
      return BetRulesPolicy.roundCurrency(amount * odds);
    }
    if (status === BetStatus.VOID || status === BetStatus.CANCELLED) {
      return BetRulesPolicy.roundCurrency(amount);
    }
    return 0;
  }

  static calculatePotentialPayout(amount: number, odds: number): number {
    return BetRulesPolicy.roundCurrency(amount * odds);
  }

  static assertMatchBettable(status: MatchStatus, bettingOpen: boolean): void {
    if (status !== MatchStatus.SCHEDULED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido está ${MATCH_STATUS_LABELS[status]}: no se permiten nuevas apuestas`,
      );
    }
    if (!bettingOpen) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Las apuestas para este partido se encuentran cerradas',
      );
    }
  }

  static assertModifiable(
    betStatus: BetStatus,
    matchStatus: MatchStatus,
    bettingOpen: boolean,
  ): void {
    if (betStatus !== BetStatus.PENDING) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La apuesta está ${BET_STATUS_LABELS[betStatus]}: solo se pueden modificar apuestas pendientes`,
      );
    }
    if (matchStatus !== MatchStatus.SCHEDULED || !bettingOpen) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se puede modificar una apuesta después de que el partido inició o cerró apuestas',
      );
    }
  }

  static assertCancellableByFan(
    betStatus: BetStatus,
    matchStatus: MatchStatus,
    bettingOpen: boolean,
  ): void {
    if (betStatus !== BetStatus.PENDING) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La apuesta está ${BET_STATUS_LABELS[betStatus]}: solo se pueden cancelar apuestas pendientes`,
      );
    }
    if (matchStatus !== MatchStatus.SCHEDULED || !bettingOpen) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se puede cancelar la apuesta porque el partido ya inició o cerró apuestas',
      );
    }
  }

  static assertVoidableByAdmin(betStatus: BetStatus): void {
    if (betStatus !== BetStatus.PENDING) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La apuesta ya está ${BET_STATUS_LABELS[betStatus]}: no puede liquidarse ni anularse más de una vez`,
      );
    }
  }
}
