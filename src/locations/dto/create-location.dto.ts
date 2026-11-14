import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';

export const MAX_LOCATION_CAPACITY = 200000;

export class CreateLocationDto {
  @Type(() => Number)
  @IsInt({ message: 'El escenario debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario no es válido' })
  venueId!: number;

  // Ej. Norte, Sur, General, VIP
  @TrimSpaces()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  name!: string;

  @Type(() => Number)
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  @Max(MAX_LOCATION_CAPACITY, {
    message: `La capacidad no puede superar ${MAX_LOCATION_CAPACITY}`,
  })
  capacity!: number;
}
