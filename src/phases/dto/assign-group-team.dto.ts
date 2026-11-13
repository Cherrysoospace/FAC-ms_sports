import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// Body de POST /group-phases/:id/teams
export class AssignGroupTeamDto {
  @Type(() => Number)
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId!: number;
}
