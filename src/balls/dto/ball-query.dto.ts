import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === undefined ? undefined : value === 'true' || value === true;

// Filtros de GET /balls
export class BallQueryDto {
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;

  // true = solo pelotas activas sin partido asignado
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({
    message: 'El filtro de disponibles debe ser verdadero o falso',
  })
  available?: boolean;
}
