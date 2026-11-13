import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreateBallDto } from './create-ball.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Actualización parcial de una pelota.
 *
 * `size` acepta `null` (borra la talla).
 * `brand`, `model` y `active` NO aceptan `null` (columnas NOT NULL): si
 * vienen, se validan; solo `undefined` significa "no cambia".
 *
 * `brand` y `model` se omiten de PartialType porque ese helper les agrega
 * `@IsOptional`, que deja pasar `null`; por eso se redeclaran con `@ValidateIf`.
 */
export class UpdateBallDto extends PartialType(
  OmitType(CreateBallDto, ['brand', 'model'] as const),
) {
  // El decorador más cercano a la propiedad (IsNotEmpty) se registra primero,
  // así su mensaje es el que muestra el filtro cuando llega null o vacío.
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(80, { message: 'La marca no puede superar los 80 caracteres' })
  @IsString({ message: 'La marca debe ser texto' })
  @IsNotEmpty({ message: 'La marca no puede ser vacía' })
  brand?: string;

  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(80, { message: 'El modelo no puede superar los 80 caracteres' })
  @IsString({ message: 'El modelo debe ser texto' })
  @IsNotEmpty({ message: 'El modelo no puede ser vacío' })
  model?: string;

  // Desactivar o reactivar la pelota
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
