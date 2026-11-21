import { MatchStatus } from '../../matches/enums/match-status.enum';
import { PaymentMethodType } from '../../payment-methods/enums/payment-method-type.enum';
import { BetSelection } from '../enums/bet-selection.enum';
import { BetStatus } from '../enums/bet-status.enum';

export class BetMatchSummaryDto {
  id!: number;
  scheduledAt!: Date;
  status!: MatchStatus;
  bettingOpen!: boolean;
  homeScore!: number | null;
  awayScore!: number | null;
  homeTeamName!: string;
  awayTeamName!: string;
  venueName!: string;
  tournamentId!: number;
  tournamentName!: string;
}

export class BetFanSummaryDto {
  id!: number;
  fullName!: string;
  documentNumber!: string;
  email!: string;
}

export class BetPaymentMethodSummaryDto {
  id!: number;
  alias!: string;
  reference!: string;
  paymentMethodId!: number;
  paymentMethodName!: string;
  paymentMethodType!: PaymentMethodType;
}

export class BetResponseDto {
  id!: number;
  selection!: BetSelection;
  amount!: number;
  odds!: number;
  potentialPayout!: number;
  status!: BetStatus;
  payout!: number | null;
  placedAt!: Date;
  settledAt!: Date | null;
  settlementNote!: string | null;
  match!: BetMatchSummaryDto;
  fan!: BetFanSummaryDto;
  paymentMethod!: BetPaymentMethodSummaryDto;
}

