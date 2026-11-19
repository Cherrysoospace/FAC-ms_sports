import { SkillCategory } from '../enums/skill-category.enum';

export class SkillResponseDto {
  id!: number;
  name!: string;
  category!: SkillCategory;
  description!: string;
}
