import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ToBoolean } from '../../common/validation';

// Filtros de GET /venues
export class VenueQueryDto {
  // Texto parcial en el nombre
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(120, {
    message: 'La búsqueda no puede superar los 120 caracteres',
  })
  search?: string;

  // Espacios internos de ese escenario
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El escenario padre debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario padre no es válido' })
  parentId?: number;

  // true = solo escenarios principales (sin padre)
  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'El filtro de raíces debe ser verdadero o falso' })
  roots?: boolean;

  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;
}
