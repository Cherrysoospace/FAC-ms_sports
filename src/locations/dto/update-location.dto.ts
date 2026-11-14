import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_LOCATION_CAPACITY } from './create-location.dto';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

/**
 * Actualización parcial de una localidad. El escenario no se puede cambiar.
 *
 * Todas las columnas son NOT NULL, así que ningún campo acepta `null`: si
 * viene, se valida; solo `undefined` significa "no cambia".
 */
export class UpdateLocationDto {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @Type(() => Number)
  @NotNullIfPresent()
  @Max(MAX_LOCATION_CAPACITY, {
    message: `La capacidad no puede superar ${MAX_LOCATION_CAPACITY}`,
  })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  capacity?: number;

  // Desactivar o reactivar la localidad
  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
