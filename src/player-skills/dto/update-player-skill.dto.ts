import { IsInt, Max, Min } from 'class-validator';
import {
  MAX_SKILL_LEVEL,
  MIN_SKILL_LEVEL,
  SKILL_LEVEL_MESSAGE,
} from './create-player-skill.dto';

// Solo cambia el nivel: el jugador y la habilidad identifican la asociación.
export class UpdatePlayerSkillDto {
  @Max(MAX_SKILL_LEVEL, { message: SKILL_LEVEL_MESSAGE })
  @Min(MIN_SKILL_LEVEL, { message: SKILL_LEVEL_MESSAGE })
  @IsInt({ message: SKILL_LEVEL_MESSAGE })
  level!: number;
}
