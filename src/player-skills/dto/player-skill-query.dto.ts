import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Filtros de GET /player-skills: habilidades de un jugador o jugadores con una habilidad.
export class PlayerSkillQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El jugador debe ser un número entero' })
  @Min(1, { message: 'El identificador del jugador no es válido' })
  playerId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'La habilidad debe ser un número entero' })
  @Min(1, { message: 'El identificador de la habilidad no es válido' })
  skillId?: number;
}
