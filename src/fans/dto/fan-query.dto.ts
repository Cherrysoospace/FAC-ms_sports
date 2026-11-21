import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ToBoolean, TrimSpaces } from '../../common/validation';

// Filtros de GET /fans
export class FanQueryDto {
  @TrimSpaces()
  @IsOptional()
  @IsString({ message: 'El texto de búsqueda debe ser texto' })
  search?: string;

  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
