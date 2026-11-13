import { TournamentStatus } from '../enums/tournament-status.enum';

export class TournamentSportDto {
  id!: number;
  name!: string;
}

export class TournamentResponseDto {
  id!: number;
  name!: string;
  sport!: TournamentSportDto;
  startDate!: string;
  endDate!: string;
  registrationOpensAt!: Date;
  registrationClosesAt!: Date;
  status!: TournamentStatus;
  active!: boolean;
  // Inscripciones en estado ACTIVE
  registrationsCount!: number;
  phasesCount!: number;
}
