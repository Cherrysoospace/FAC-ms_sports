import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';

export class TournamentVenueTournamentDto {
  id!: number;
  name!: string;
  status!: TournamentStatus;
}

export class TournamentVenueParentDto {
  id!: number;
  name!: string;
}

export class TournamentVenueVenueDto {
  id!: number;
  name!: string;
  address!: string | null;
  // Complejo que lo contiene; null = escenario principal
  parent!: TournamentVenueParentDto | null;
}

export class TournamentVenueResponseDto {
  id!: number;
  tournament!: TournamentVenueTournamentDto;
  venue!: TournamentVenueVenueDto;
  // Partidos no CANCELLED del torneo en este escenario o en sus espacios
  // internos que no tengan su propia asociación con el torneo. Es la misma
  // regla que impide retirar la asociación (> 0 = no se puede retirar).
  scheduledMatchesCount!: number;
}
