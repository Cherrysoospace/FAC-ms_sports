import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';

export class CreateVenueDto {
  @TrimSpaces()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  name!: string;

  // Ausente o null = sin dirección
  @TrimSpaces()
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(200, {
    message: 'La dirección no puede superar los 200 caracteres',
  })
  address?: string | null;

  // Para crear un espacio interno (ej. una cancha dentro de un complejo).
  // Ausente o null = escenario principal.
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El escenario padre debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario padre no es válido' })
  parentId?: number | null;
}
