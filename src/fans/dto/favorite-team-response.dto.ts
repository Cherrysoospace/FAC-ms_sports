import { TeamModality } from '../../teams/enums/team-modality.enum';

export class FavoriteTeamSummaryDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
  active!: boolean;
}

export class FavoriteTeamResponseDto {
  id!: number;
  createdAt!: Date;
  team!: FavoriteTeamSummaryDto;
}

