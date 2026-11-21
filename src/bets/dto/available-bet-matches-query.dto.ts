import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Filtros para consultar partidos disponibles para apostar (GET /bets/available-matches).
export class AvailableBetMatchesQueryDto {
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
}
