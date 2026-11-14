import { TeamModality } from '../../teams/enums/team-modality.enum';

export class TeamSportTeamDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
}

export class TeamSportSportDto {
  id!: number;
  name!: string;
}

export class TeamSportResponseDto {
  id!: number;
  team!: TeamSportTeamDto;
  sport!: TeamSportSportDto;
}
