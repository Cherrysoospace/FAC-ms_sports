import { MatchStatus } from '../../matches/enums/match-status.enum';

export class GoalTeamRefDto {
  id!: number;
  name!: string;
}

export class GoalMatchSummaryDto {
  id!: number;
  scheduledAt!: Date;
  status!: MatchStatus;
  homeTeam!: GoalTeamRefDto;
  awayTeam!: GoalTeamRefDto;
}

export class GoalPlayerSummaryDto {
  id!: number;
  fullName!: string;
  documentNumber!: string;
  position!: string;
}

export class GoalResponseDto {
  id!: number;
  minute!: number;
  points!: number;
  description!: string | null;
  recordedAt!: Date;
  match!: GoalMatchSummaryDto;
  player!: GoalPlayerSummaryDto;
}
