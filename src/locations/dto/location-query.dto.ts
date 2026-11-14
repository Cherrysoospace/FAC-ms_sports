import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === undefined ? undefined : value === 'true' || value === true;

// Filtros de GET /locations
export class LocationQueryDto {
  // Localidades de ese escenario
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El escenario debe ser un número entero' })
  @Min(1, { message: 'El identificador del escenario no es válido' })
  venueId?: number;

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;
}
