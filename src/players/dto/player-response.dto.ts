import { DominantFoot } from '../enums/dominant-foot.enum';

export class PlayerTeamSummaryDto {
  id!: number;
  name!: string;
}

export class PlayerResponseDto {
  id!: number;
  fullName!: string;
  documentNumber!: string;
  // 'YYYY-MM-DD'
  birthDate!: string;
  // Calculada a partir de birthDate
  age!: number;
  nationality!: string;
  position!: string;
  heightCm!: number;
  dominantFoot!: DominantFoot | null;
  active!: boolean;
  // Equipos con contrato vigente (team_players ACTIVE); vacío = sin equipo
  currentTeams!: PlayerTeamSummaryDto[];
}
