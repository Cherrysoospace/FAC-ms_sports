import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SkillCategory } from '../enums/skill-category.enum';
import { SKILL_CATEGORY_MESSAGE } from './create-skill.dto';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

/**
 * Actualización parcial de una habilidad. Todas las columnas son NOT NULL:
 * si un campo viene (aunque sea null) se valida; `undefined` = no cambia.
 */
export class UpdateSkillDto {
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  @NotNullIfPresent()
  @IsEnum(SkillCategory, { message: SKILL_CATEGORY_MESSAGE })
  category?: SkillCategory;

  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(500, {
    message: 'La descripción no puede superar los 500 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción no puede ser vacía' })
  description?: string;
}
