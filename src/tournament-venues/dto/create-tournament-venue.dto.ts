import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// Habilita un escenario para un torneo.
export class CreateTournamentVenueDto {
  @Type(() => Number)
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId!: number;

  @Type(() => Number)
  @IsInt({ message: 'El escenario debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario no es válido' })
  venueId!: number;
}
