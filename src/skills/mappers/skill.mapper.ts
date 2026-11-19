import { Skill } from '../entities/skill.entity';
import { CreateSkillDto } from '../dto/create-skill.dto';
import { UpdateSkillDto } from '../dto/update-skill.dto';
import { SkillResponseDto } from '../dto/skill-response.dto';

export class SkillMapper {
  static toEntity(dto: CreateSkillDto): Skill {
    const entity = new Skill();
    entity.name = dto.name;
    entity.category = dto.category;
    entity.description = dto.description;
    return entity;
  }

  static mergeEntity(entity: Skill, dto: UpdateSkillDto): Skill {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.description !== undefined) entity.description = dto.description;
    return entity;
  }

  static toResponseDto(entity: Skill): SkillResponseDto {
    const dto = new SkillResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.category = entity.category;
    dto.description = entity.description;
    return dto;
  }

  static toResponseDtoList(entities: Skill[]): SkillResponseDto[] {
    return entities.map((e) => SkillMapper.toResponseDto(e));
  }
}
