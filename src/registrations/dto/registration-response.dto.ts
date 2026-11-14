import { RegistrationStatus } from '../enums/registration-status.enum';
import { TeamModality } from '../../teams/enums/team-modality.enum';

export class RegistrationTournamentDto {
  id!: number;
  name!: string;
}

export class RegistrationTeamDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
}

export class RegistrationResponseDto {
  id!: number;
  tournament!: RegistrationTournamentDto;
  team!: RegistrationTeamDto;
  status!: RegistrationStatus;
  registeredAt!: Date;
  withdrawnAt!: Date | null;
}
