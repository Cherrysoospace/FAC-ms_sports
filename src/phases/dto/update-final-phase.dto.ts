import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FinalRound } from '../enums/final-round.enum';
import {
  CreateFinalPhaseDto,
  FINAL_ROUND_MESSAGE,
} from './create-final-phase.dto';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

/**
 * Actualización parcial de una fase final. El torneo no se puede cambiar.
 *
 * `startDate` y `endDate` aceptan `null` (se borran).
 * `name`, `order` y `round` NO aceptan `null` (columnas NOT NULL): se omiten
 * de PartialType (agrega `@IsOptional`) y se redeclaran con `@NotNullIfPresent`.
 */
export class UpdateFinalPhaseDto extends PartialType(
  OmitType(CreateFinalPhaseDto, [
    'tournamentId',
    'name',
    'order',
    'round',
  ] as const),
) {
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El orden debe ser mayor o igual a 1' })
  @IsInt({ message: 'El orden debe ser un número entero' })
  order?: number;

  @NotNullIfPresent()
  @IsEnum(FinalRound, { message: FINAL_ROUND_MESSAGE })
  round?: FinalRound;
}
