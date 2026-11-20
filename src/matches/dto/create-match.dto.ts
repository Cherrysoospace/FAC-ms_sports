import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNotEmpty, Min } from 'class-validator';

// HU-GC-06: partido de una fase, con sus dos equipos, escenario y pelota.
export class CreateMatchDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador de la fase no es válido' })
  @IsInt({ message: 'La fase es obligatoria y debe ser un número entero' })
  phaseId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del equipo local no es válido' })
  @IsInt({
    message: 'El equipo local es obligatorio y debe ser un número entero',
  })
  homeTeamId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del equipo visitante no es válido' })
  @IsInt({
    message: 'El equipo visitante es obligatorio y debe ser un número entero',
  })
  awayTeamId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del escenario no es válido' })
  @IsInt({ message: 'El escenario es obligatorio y debe ser un número entero' })
  venueId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador de la pelota no es válido' })
  @IsInt({ message: 'La pelota es obligatoria y debe ser un número entero' })
  ballId!: number;

  // Fecha y hora ISO 8601 (ej. 2027-02-10T20:00:00.000Z)
  @IsISO8601(
    { strict: true },
    { message: 'La fecha del partido debe ser una fecha y hora ISO 8601' },
  )
  @IsNotEmpty({ message: 'La fecha del partido es obligatoria' })
  scheduledAt!: string;
}
