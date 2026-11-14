import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// Asocia un equipo a un deporte que juega.
export class CreateTeamSportDto {
  @Type(() => Number)
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId!: number;

  @Type(() => Number)
  @IsInt({ message: 'El deporte debe ser un número entero' })
  @Min(1, { message: 'El identificador del deporte no es válido' })
  sportId!: number;
}
