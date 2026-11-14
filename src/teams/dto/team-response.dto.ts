import { TeamModality } from '../enums/team-modality.enum';

export class TeamSportSummaryDto {
  id!: number;
  name!: string;
}

export class TeamGroupDto {
  id!: number;
  groupName!: string;
  tournamentId!: number;
}

export class TeamResponseDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
  active!: boolean;
  // Deportes que juega (team_sports)
  sports!: TeamSportSummaryDto[];
  // Grupo actual; null = sin grupo
  group!: TeamGroupDto | null;
  // Inscripciones en estado ACTIVE
  activeRegistrationsCount!: number;
}
