import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ToBoolean } from '../../common/validation';

// Filtros de GET /players
export class PlayerQueryDto {
  // Texto parcial en el nombre o en el documento
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(120, {
    message: 'La búsqueda no puede superar los 120 caracteres',
  })
  search?: string;

  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;
}
