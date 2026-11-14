import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

// Inscribe uno o varios equipos en un torneo (todo o nada).
export class CreateRegistrationDto {
  @Type(() => Number)
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId!: number;

  @Type(() => Number)
  @IsArray({ message: 'teamIds debe ser una lista de equipos' })
  @ArrayNotEmpty({ message: 'Debe indicar al menos un equipo' })
  @ArrayMaxSize(50, {
    message: 'No se pueden inscribir más de 50 equipos a la vez',
  })
  @ArrayUnique({ message: 'La lista de equipos tiene equipos repetidos' })
  @IsInt({ each: true, message: 'Cada equipo debe ser un número entero' })
  @Min(1, {
    each: true,
    message: 'El identificador de un equipo no es válido',
  })
  teamIds!: number[];
}
