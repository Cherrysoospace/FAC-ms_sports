import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreateSportDto } from './create-sport.dto';

/**
 * Actualización parcial de un deporte.
 *
 * `parentId`:
 *  - ausente (undefined) = no cambia el padre.
 *  - `null` = el deporte pasa a ser raíz (sin padre).
 *  - número = nuevo padre (el servicio valida existencia y ciclos).
 *
 * `description` también acepta `null` (borra la descripción).
 * `name` y `active` NO aceptan `null` (columnas NOT NULL): si vienen, se
 * validan; solo `undefined` significa "no cambia".
 *
 * `name` se omite de PartialType porque ese helper le agrega `@IsOptional`,
 * que deja pasar `null`, y un decorador heredado no se puede quitar desde la
 * subclase; por eso se redeclara abajo con `@ValidateIf`.
 */
export class UpdateSportDto extends PartialType(
  OmitType(CreateSportDto, ['name'] as const),
) {
  // El decorador más cercano a la propiedad (IsNotEmpty) se registra primero,
  // así su mensaje es el que muestra el filtro cuando llega null o vacío.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  // Desactivar o reactivar el deporte
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
