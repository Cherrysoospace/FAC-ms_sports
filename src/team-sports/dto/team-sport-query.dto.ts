import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Filtros de GET /team-sports: deportes de un equipo o equipos de un deporte.
export class TeamSportQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El deporte debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte no es válido' })
  sportId?: number;
}
