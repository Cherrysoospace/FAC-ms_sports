import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateTournamentDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(150, { message: 'El nombre no puede superar los 150 caracteres' })
  name!: string;

  @Type(() => Number)
  @IsInt({ message: 'El deporte debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte no es válido' })
  sportId!: number;

  // Fechas sin hora (YYYY-MM-DD)
  @Matches(DATE_ONLY_REGEX, {
    message: 'La fecha de inicio debe tener el formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'La fecha de inicio no es una fecha válida' },
  )
  startDate!: string;

  @Matches(DATE_ONLY_REGEX, {
    message: 'La fecha de fin debe tener el formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'La fecha de fin no es una fecha válida' },
  )
  endDate!: string;

  // Fecha y hora ISO 8601 (ej. 2026-12-01T08:00:00)
  @IsDateString(
    { strict: true },
    {
      message:
        'La apertura de inscripciones debe ser una fecha y hora ISO 8601',
    },
  )
  registrationOpensAt!: string;

  @IsDateString(
    { strict: true },
    {
      message: 'El cierre de inscripciones debe ser una fecha y hora ISO 8601',
    },
  )
  registrationClosesAt!: string;
}
