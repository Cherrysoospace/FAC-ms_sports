import { TeamModality } from '../../teams/enums/team-modality.enum';

export class RelatedTeamResponseDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
  active!: boolean;
}
