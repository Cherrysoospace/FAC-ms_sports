import { MatchStatus } from '../enums/match-status.enum';

export class MatchTournamentDto {
  id!: number;
  name!: string;
}

export class MatchPhaseDto {
  id!: number;
  name!: string;
  // GROUP = fase de grupos (groupName); FINAL = fase final (round)
  type!: 'GROUP' | 'FINAL';
  // 'Grupo A', 'Semifinal'...
  label!: string;
  tournament!: MatchTournamentDto;
}

export class MatchTeamDto {
  id!: number;
  name!: string;
}

export class MatchVenueDto {
  id!: number;
  name!: string;
}

export class MatchBallDto {
  id!: number;
  brand!: string;
  model!: string;
}

export class MatchResponseDto {
  id!: number;
  // Fecha y hora ISO 8601
  scheduledAt!: Date;
  status!: MatchStatus;
  // null hasta que se registre el resultado (HU-GC-07)
  homeScore!: number | null;
  awayScore!: number | null;
  bettingOpen!: boolean;
  phase!: MatchPhaseDto;
  homeTeam!: MatchTeamDto;
  awayTeam!: MatchTeamDto;
  venue!: MatchVenueDto;
  ball!: MatchBallDto;
}
