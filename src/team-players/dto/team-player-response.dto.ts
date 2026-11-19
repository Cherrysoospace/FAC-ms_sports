import { TeamModality } from '../../teams/enums/team-modality.enum';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractStage } from '../enums/contract-stage.enum';
import { ReleaseReason } from '../enums/release-reason.enum';

export class TeamPlayerTeamDto {
  id!: number;
  name!: string;
  city!: string;
  modality!: TeamModality;
}

export class TeamPlayerPlayerDto {
  id!: number;
  fullName!: string;
  documentNumber!: string;
  position!: string;
  age!: number;
}

export class TeamPlayerResponseDto {
  id!: number;
  team!: TeamPlayerTeamDto;
  player!: TeamPlayerPlayerDto;
  // Fechas 'YYYY-MM-DD'
  startDate!: string;
  endDate!: string;
  status!: ContractStatus;
  // Calculado: CURRENT (vigente hoy), UPCOMING o PAST (historial)
  stage!: ContractStage;
  // Solo en contratos RELEASED (historial)
  releaseDate!: string | null;
  releaseReason!: ReleaseReason | null;
}
