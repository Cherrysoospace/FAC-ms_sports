import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '../../common/validation';

// Filtros de GET /balls
export class BallQueryDto {
  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;

  // true = solo pelotas activas sin partido asignado
  @ToBoolean()
  @IsOptional()
  @IsBoolean({
    message: 'El filtro de disponibles debe ser verdadero o falso',
  })
  available?: boolean;
}
