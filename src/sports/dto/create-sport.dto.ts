import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSportDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, {
    message: 'La descripción no puede superar los 255 caracteres',
  })
  description?: string;

  // Para crear un subdeporte (ej. Fútbol de salón con parentId de Fútbol).
  // Ausente o null = deporte raíz.
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El deporte padre debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte padre no es válido' })
  parentId?: number | null;
}
