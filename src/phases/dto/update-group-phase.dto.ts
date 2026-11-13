import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateGroupPhaseDto } from './create-group-phase.dto';

const isPresent = (_: unknown, value: unknown): boolean => value !== undefined;

/**
 * Actualización parcial de un grupo. El torneo no se puede cambiar.
 *
 * `qualifiersCount`, `startDate` y `endDate` aceptan `null` (se borran).
 * `name`, `order` y `groupName` NO aceptan `null` (columnas NOT NULL): si
 * vienen, se validan; solo `undefined` significa "no cambia". Se omiten de
 * PartialType (agrega `@IsOptional`) y se redeclaran con `@ValidateIf`.
 */
export class UpdateGroupPhaseDto extends PartialType(
  OmitType(CreateGroupPhaseDto, [
    'tournamentId',
    'name',
    'order',
    'groupName',
  ] as const),
) {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf(isPresent)
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @Type(() => Number)
  @ValidateIf(isPresent)
  @Min(1, { message: 'El orden debe ser mayor o igual a 1' })
  @IsInt({ message: 'El orden debe ser un número entero' })
  order?: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf(isPresent)
  @MaxLength(10, {
    message: 'El nombre del grupo no puede superar los 10 caracteres',
  })
  @IsString({ message: 'El nombre del grupo debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del grupo no puede ser vacío' })
  groupName?: string;
}
