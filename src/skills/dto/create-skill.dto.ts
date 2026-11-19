import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SkillCategory } from '../enums/skill-category.enum';
import { TrimSpaces } from '../../common/validation';

export const SKILL_CATEGORY_MESSAGE = `La categoría debe ser una de: ${Object.values(SkillCategory).join(', ')}`;

export class CreateSkillDto {
  // El decorador más cercano a la propiedad se registra primero y su mensaje
  // es el que muestra el filtro: así un campo ausente dice "es obligatorio".
  @TrimSpaces()
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsEnum(SkillCategory, { message: SKILL_CATEGORY_MESSAGE })
  category!: SkillCategory;

  @TrimSpaces()
  @MaxLength(500, {
    message: 'La descripción no puede superar los 500 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description!: string;
}
