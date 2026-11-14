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
import { TeamModality } from '../enums/team-modality.enum';
import { TEAM_MODALITY_MESSAGE } from './create-team.dto';

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === undefined ? undefined : value === 'true' || value === true;

// Filtros de GET /teams
export class TeamQueryDto {
  // Texto parcial en el nombre
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(120, { message: 'La búsqueda no puede superar los 120 caracteres' })
  search?: string;

  @IsOptional()
  @IsEnum(TeamModality, { message: TEAM_MODALITY_MESSAGE })
  modality?: TeamModality;

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  active?: boolean;

  // Equipos que juegan ese deporte (fila en team_sports)
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El deporte debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte no es válido' })
  sportId?: number;
}
