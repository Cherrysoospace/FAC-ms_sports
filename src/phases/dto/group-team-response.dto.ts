import { TeamModality } from '../../teams/enums/team-modality.enum';

// Equipo de un grupo (GET /group-phases/:id/teams)
export class GroupTeamResponseDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
}
