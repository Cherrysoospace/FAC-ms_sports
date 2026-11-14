import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_LOCATION_CAPACITY } from './create-location.dto';

const isPresent = (_: unknown, value: unknown): boolean => value !== undefined;

/**
 * Actualización parcial de una localidad. El escenario no se puede cambiar.
 *
 * Todas las columnas son NOT NULL, así que ningún campo acepta `null`: si
 * viene, se valida; solo `undefined` significa "no cambia".
 */
export class UpdateLocationDto {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf(isPresent)
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @Type(() => Number)
  @ValidateIf(isPresent)
  @Max(MAX_LOCATION_CAPACITY, {
    message: `La capacidad no puede superar ${MAX_LOCATION_CAPACITY}`,
  })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  capacity?: number;

  // Desactivar o reactivar la localidad
  @ValidateIf(isPresent)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
