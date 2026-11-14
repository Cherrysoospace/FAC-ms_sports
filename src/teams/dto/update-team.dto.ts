import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TeamModality } from '../enums/team-modality.enum';
import { collapseSpaces, TEAM_MODALITY_MESSAGE } from './create-team.dto';

const isPresent = (_: unknown, value: unknown): boolean => value !== undefined;

/**
 * Actualización parcial de un equipo.
 *
 * Todas las columnas son NOT NULL, así que ningún campo acepta `null`: si
 * viene, se valida; solo `undefined` significa "no cambia". Por eso no se usa
 * PartialType (agrega `@IsOptional`, que deja pasar `null`) sino `@ValidateIf`.
 */
export class UpdateTeamDto {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @Transform(collapseSpaces)
  @ValidateIf(isPresent)
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @Transform(collapseSpaces)
  @ValidateIf(isPresent)
  @MaxLength(80, { message: 'La ciudad no puede superar los 80 caracteres' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @IsNotEmpty({ message: 'La ciudad no puede ser vacía' })
  city?: string;

  @ValidateIf(isPresent)
  @IsEnum(TeamModality, { message: TEAM_MODALITY_MESSAGE })
  modality?: TeamModality;

  // Desactivar o reactivar el equipo
  @ValidateIf(isPresent)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
