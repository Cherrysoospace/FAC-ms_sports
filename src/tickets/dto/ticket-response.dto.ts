import { MatchStatus } from '../../matches/enums/match-status.enum';

export class TicketMatchSummaryDto {
  id!: number;
  scheduledAt!: Date;
  status!: MatchStatus;
  homeTeamName!: string;
  awayTeamName!: string;
  venueId!: number;
  venueName!: string;
}

export class TicketLocationSummaryDto {
  id!: number;
  name!: string;
  capacity!: number;
}

export class TicketFanSummaryDto {
  id!: number;
  fullName!: string;
  documentNumber!: string;
  email!: string;
}

export class TicketResponseDto {
  id!: number;
  code!: string;
  price!: number;
  purchasedAt!: Date;
  match!: TicketMatchSummaryDto;
  location!: TicketLocationSummaryDto;
  fan!: TicketFanSummaryDto;
}

