import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TournamentStatus } from '../enums/tournament-status.enum';
import { DATE_ONLY_REGEX } from './create-tournament.dto';

const isPresent = (_: unknown, value: unknown): boolean => value !== undefined;

/**
 * Actualización parcial de un torneo.
 *
 * Todas las columnas son NOT NULL, así que ningún campo acepta `null`: si
 * viene, se valida; solo `undefined` significa "no cambia". Por eso no se usa
 * PartialType (agrega `@IsOptional`, que deja pasar `null`) sino `@ValidateIf`.
 */
export class UpdateTournamentDto {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf(isPresent)
  @MaxLength(150, { message: 'El nombre no puede superar los 150 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @Type(() => Number)
  @ValidateIf(isPresent)
  @Min(1, { message: 'El identificador del deporte no es válido' })
  @IsInt({ message: 'El deporte debe ser un número entero' })
  sportId?: number;

  @ValidateIf(isPresent)
  @IsDateString(
    { strict: true },
    { message: 'La fecha de inicio no es una fecha válida' },
  )
  @Matches(DATE_ONLY_REGEX, {
    message: 'La fecha de inicio debe tener el formato YYYY-MM-DD',
  })
  startDate?: string;

  @ValidateIf(isPresent)
  @IsDateString(
    { strict: true },
    { message: 'La fecha de fin no es una fecha válida' },
  )
  @Matches(DATE_ONLY_REGEX, {
    message: 'La fecha de fin debe tener el formato YYYY-MM-DD',
  })
  endDate?: string;

  @ValidateIf(isPresent)
  @IsDateString(
    { strict: true },
    {
      message:
        'La apertura de inscripciones debe ser una fecha y hora ISO 8601',
    },
  )
  registrationOpensAt?: string;

  @ValidateIf(isPresent)
  @IsDateString(
    { strict: true },
    {
      message: 'El cierre de inscripciones debe ser una fecha y hora ISO 8601',
    },
  )
  registrationClosesAt?: string;

  @ValidateIf(isPresent)
  @IsEnum(TournamentStatus, {
    message: `El estado debe ser uno de: ${Object.values(TournamentStatus).join(', ')}`,
  })
  status?: TournamentStatus;

  // Desactivar o reactivar el torneo
  @ValidateIf(isPresent)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
