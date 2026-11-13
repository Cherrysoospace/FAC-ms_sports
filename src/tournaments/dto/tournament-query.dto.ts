import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TournamentStatus } from '../enums/tournament-status.enum';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === undefined ? undefined : value === 'true' || value === true;

// Filtros de GET /tournaments
export class TournamentQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El deporte debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte no es válido' })
  sportId?: number;

  @IsOptional()
  @IsEnum(TournamentStatus, {
    message: `El estado debe ser uno de: ${Object.values(TournamentStatus).join(', ')}`,
  })
  status?: TournamentStatus;

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;

  // Texto parcial en el nombre
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(150, { message: 'La búsqueda no puede superar los 150 caracteres' })
  search?: string;
}
