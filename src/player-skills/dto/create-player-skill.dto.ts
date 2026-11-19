import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const MIN_SKILL_LEVEL = 1;
export const MAX_SKILL_LEVEL = 100;
export const SKILL_LEVEL_MESSAGE = `El nivel debe ser un número entero entre ${MIN_SKILL_LEVEL} y ${MAX_SKILL_LEVEL}`;

// Asigna una habilidad del catálogo a un jugador con su nivel.
export class CreatePlayerSkillDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del jugador no es válido' })
  @IsInt({ message: 'El jugador es obligatorio y debe ser un número entero' })
  playerId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador de la habilidad no es válido' })
  @IsInt({
    message: 'La habilidad es obligatoria y debe ser un número entero',
  })
  skillId!: number;

  @Max(MAX_SKILL_LEVEL, { message: SKILL_LEVEL_MESSAGE })
  @Min(MIN_SKILL_LEVEL, { message: SKILL_LEVEL_MESSAGE })
  @IsInt({ message: SKILL_LEVEL_MESSAGE })
  level!: number;
}
