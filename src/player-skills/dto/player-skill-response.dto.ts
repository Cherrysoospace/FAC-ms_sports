import { SkillCategory } from '../../skills/enums/skill-category.enum';

export class PlayerSkillPlayerDto {
  id!: number;
  fullName!: string;
  position!: string;
}

export class PlayerSkillSkillDto {
  id!: number;
  name!: string;
  category!: SkillCategory;
  description!: string;
}

export class PlayerSkillResponseDto {
  id!: number;
  player!: PlayerSkillPlayerDto;
  skill!: PlayerSkillSkillDto;
  level!: number;
}
