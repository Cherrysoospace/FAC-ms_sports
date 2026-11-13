import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === undefined ? undefined : value === 'true' || value === true;

// Filtros de GET /sports
export class SportQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El deporte padre debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte padre no es válido' })
  parentId?: number;

  // true = solo deportes sin padre
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El filtro de raíces debe ser verdadero o falso' })
  roots?: boolean;

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;
}
