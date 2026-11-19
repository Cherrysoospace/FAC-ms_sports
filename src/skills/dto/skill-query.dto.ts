import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SkillCategory } from '../enums/skill-category.enum';
import { SKILL_CATEGORY_MESSAGE } from './create-skill.dto';

// Filtros de GET /skills
export class SkillQueryDto {
  // Texto parcial en el nombre
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(80, { message: 'La búsqueda no puede superar los 80 caracteres' })
  search?: string;

  @IsOptional()
  @IsEnum(SkillCategory, { message: SKILL_CATEGORY_MESSAGE })
  category?: SkillCategory;
}
