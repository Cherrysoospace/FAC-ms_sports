import { MatchStatus } from '../../matches/enums/match-status.enum';

export class BoardPointDto {
  x!: number;
  y!: number;
  // Fecha y hora ISO 8601 del registro
  recordedAt!: Date;
}

export class BoardTeamDto {
  id!: number;
  name!: string;
  // HOME = local; AWAY = visitante (la pizarra los pinta de colores distintos)
  side!: 'HOME' | 'AWAY';
}

export class BoardPlayerDto {
  id!: number;
  fullName!: string;
  position!: string;
  team!: BoardTeamDto;
  // null = aún no tiene posición registrada en este partido
  location!: BoardPointDto | null;
}

/**
 * Estado actual de la pizarra (HU-GC-09): solo los jugadores que participan
 * (plantilla vigente de los dos equipos) y la pelota del partido.
 */
export class BoardResponseDto {
  matchId!: number;
  status!: MatchStatus;
  homeTeam!: BoardTeamDto;
  awayTeam!: BoardTeamDto;
  ball!: {
    id: number;
    brand: string;
    model: string;
    location: BoardPointDto | null;
  };
  players!: BoardPlayerDto[];
}

// Respuesta de POST /match-positions
export class RecordPositionsResultDto {
  matchId!: number;
  recorded!: number;
  recordedAt!: Date;
}
