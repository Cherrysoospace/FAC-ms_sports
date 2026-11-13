import { Sport } from '../entities/sport.entity';
import { CreateSportDto } from '../dto/create-sport.dto';
import { UpdateSportDto } from '../dto/update-sport.dto';
import { SportResponseDto, SportSummaryDto } from '../dto/sport-response.dto';

// Las propiedades `description` y `parent` de la entidad no admiten null en
// su tipo (`?: string` / `?: Sport`), pero la columna sí es nullable; se usan
// casts para no modificar la entidad.
export class SportMapper {
  static toEntity(dto: CreateSportDto, parent: Sport | null): Sport {
    const entity = new Sport();
    entity.name = dto.name;
    entity.description = (dto.description ?? null) as string;
    entity.active = true;
    entity.parent = parent as Sport;
    return entity;
  }

  static mergeEntity(
    entity: Sport,
    dto: UpdateSportDto,
    parent?: Sport | null,
  ): Sport {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined) {
      entity.description = (dto.description ?? null) as string;
    }
    if (dto.active !== undefined) entity.active = dto.active;
    // parentId ausente = no cambia; null = pasa a ser raíz
    if (dto.parentId !== undefined) entity.parent = (parent ?? null) as Sport;
    return entity;
  }

  static toSummaryDto(entity: Sport): SportSummaryDto {
    const dto = new SportSummaryDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.active = entity.active;
    return dto;
  }

  static toResponseDto(entity: Sport): SportResponseDto {
    const dto = new SportResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description ?? null;
    dto.active = entity.active;
    dto.parent = entity.parent ? SportMapper.toSummaryDto(entity.parent) : null;
    if (entity.subSports) {
      dto.subSports = entity.subSports.map((s) => SportMapper.toSummaryDto(s));
    }
    return dto;
  }

  static toResponseDtoList(entities: Sport[]): SportResponseDto[] {
    return entities.map((e) => SportMapper.toResponseDto(e));
  }
}
