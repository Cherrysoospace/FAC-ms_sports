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

  // Jugadores con contrato vigente en ese equipo
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId?: number;

  // Jugadores de equipos que juegan ese deporte
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El deporte debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte no es válido' })
  sportId?: number;

  // HU-GD-07: jugadores que poseen esa habilidad
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'La habilidad debe ser un número entero' })
  @Min(1, { message: 'El identificador de la habilidad no es válido' })
  skillId?: number;
}
