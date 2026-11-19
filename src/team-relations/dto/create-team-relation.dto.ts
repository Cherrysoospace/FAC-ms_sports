import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// Relaciona el equipo de la ruta con otro equipo (autorrelación n — n).
export class CreateTeamRelationDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del equipo relacionado no es válido' })
  @IsInt({
    message: 'El equipo relacionado es obligatorio y debe ser un número entero',
  })
  relatedTeamId!: number;
}
