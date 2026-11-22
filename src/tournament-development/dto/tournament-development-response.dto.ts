import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { FinalRound } from '../../phases/enums/final-round.enum';

export class DevelopmentRefDto {
  id!: number;
  name!: string;
}

export class DevelopmentTournamentDto {
  id!: number;
  name!: string;
  sport!: DevelopmentRefDto;
  status!: TournamentStatus;
  startDate!: string;
  endDate!: string;
  registrationOpensAt!: Date;
  registrationClosesAt!: Date;
  active!: boolean;
}

export class DevelopmentSummaryDto {
  teams!: number;
  matches!: number;
  // Con resultado registrado
  finishedMatches!: number;
  // Sin resultado y no cancelados
  pendingMatches!: number;
  cancelledMatches!: number;
  // Total de anotaciones registradas en el torneo
  goals!: number;
  // finishedMatches / (matches - cancelledMatches), 0 a 100
  completionPercentage!: number;
  // Menor order con partidos pendientes; la última si todas terminaron; null sin fases
  currentPhase!: DevelopmentCurrentPhaseDto | null;
  // Perdedores de la fase final + los que no clasificaron en grupos terminados
  eliminatedTeams!: DevelopmentRefDto[];
}

export class DevelopmentCurrentGroupPhaseDto {
  id!: number;
  name!: string;
  type!: 'GROUP';
  groupName!: string;
}

export class DevelopmentCurrentFinalPhaseDto {
  id!: number;
  name!: string;
  type!: 'FINAL';
  round!: FinalRound;
}

export type DevelopmentCurrentPhaseDto =
  DevelopmentCurrentGroupPhaseDto | DevelopmentCurrentFinalPhaseDto;

export class DevelopmentPlayerDto {
  id!: number;
  fullName!: string;
}

export class DevelopmentGoalDto {
  id!: number;
  minute!: number;
  points!: number;
  description!: string | null;
  player!: DevelopmentPlayerDto;
  // Deducido de los contratos del jugador; null si no se puede determinar
  team!: DevelopmentRefDto | null;
}

export class DevelopmentMatchDto {
  id!: number;
  scheduledAt!: Date;
  status!: MatchStatus;
  homeTeam!: DevelopmentRefDto;
  awayTeam!: DevelopmentRefDto;
  homeScore!: number | null;
  awayScore!: number | null;
  // true = resultado registrado; false = pendiente o cancelado
  hasResult!: boolean;
  venue!: DevelopmentRefDto;
  goals!: DevelopmentGoalDto[];
}

export class DevelopmentStandingDto {
  position!: number;
  team!: DevelopmentRefDto;
  played!: number;
  won!: number;
  drawn!: number;
  lost!: number;
  goalsFor!: number;
  goalsAgainst!: number;
  goalDifference!: number;
  points!: number;
}

export class DevelopmentGroupDto {
  id!: number;
  groupName!: string;
  // 'Grupo A'
  label!: string;
  qualifiersCount!: number | null;
  teams!: DevelopmentRefDto[];
  standings!: DevelopmentStandingDto[];
  matches!: DevelopmentMatchDto[];
}

export class DevelopmentTieDto {
  teamA!: DevelopmentRefDto;
  teamB!: DevelopmentRefDto;
  teamAScore!: number | null;
  teamBScore!: number | null;
  winner!: DevelopmentRefDto | null;
  matches!: DevelopmentMatchDto[];
}

// Fase de grupos: todos los grupos que comparten orden en el torneo.
export class DevelopmentGroupStageDto {
  type!: 'GROUP';
  order!: number;
  name!: string;
  startDate!: string | null;
  endDate!: string | null;
  groups!: DevelopmentGroupDto[];
}

// Una ronda de la fase final con sus llaves.
export class DevelopmentFinalRoundDto {
  type!: 'FINAL';
  id!: number;
  order!: number;
  name!: string;
  round!: FinalRound;
  // 'Semifinal'
  label!: string;
  startDate!: string | null;
  endDate!: string | null;
  ties!: DevelopmentTieDto[];
}

export type DevelopmentPhaseDto =
  DevelopmentGroupStageDto | DevelopmentFinalRoundDto;

export class TournamentDevelopmentResponseDto {
  tournament!: DevelopmentTournamentDto;
  summary!: DevelopmentSummaryDto;
  // En el orden de la competencia (phase_order)
  phases!: DevelopmentPhaseDto[];
}
