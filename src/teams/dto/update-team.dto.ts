import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { TeamModality } from '../enums/team-modality.enum';
import { TEAM_MODALITY_MESSAGE } from './create-team.dto';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

/**
 * Actualización parcial de un equipo.
 *
 * Todas las columnas son NOT NULL, así que ningún campo acepta `null`: si
 * viene, se valida; solo `undefined` significa "no cambia". Por eso no se usa
 * PartialType (agrega `@IsOptional`, que deja pasar `null`) sino `@NotNullIfPresent`.
 */
export class UpdateTeamDto {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(80, { message: 'La ciudad no puede superar los 80 caracteres' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @IsNotEmpty({ message: 'La ciudad no puede ser vacía' })
  city?: string;

  @NotNullIfPresent()
  @IsEnum(TeamModality, { message: TEAM_MODALITY_MESSAGE })
  modality?: TeamModality;

  // Desactivar o reactivar el equipo
  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
