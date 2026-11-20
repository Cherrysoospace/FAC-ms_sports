import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MatchStatus } from '../enums/match-status.enum';
import { MATCH_STATUS_MESSAGE } from './update-match.dto';

// Filtros de GET /matches
export class MatchQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'La fase debe ser un número entero' })
  @Min(1, { message: 'El identificador de la fase no es válido' })
  phaseId?: number;

  // Partidos en los que juega (local o visitante)
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El escenario debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario no es válido' })
  venueId?: number;

  @IsOptional()
  @IsEnum(MatchStatus, { message: MATCH_STATUS_MESSAGE })
  status?: MatchStatus;
}
