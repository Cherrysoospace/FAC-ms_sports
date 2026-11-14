import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Filtros de GET /tournament-venues: escenarios de un torneo o torneos de un escenario.
export class TournamentVenueQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El escenario debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario no es válido' })
  venueId?: number;
}
