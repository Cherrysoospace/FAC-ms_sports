import { Venue } from '../entities/venue.entity';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';
import {
  VenueChildDto,
  VenueParentDto,
  VenueResponseDto,
} from '../dto/venue-response.dto';
import { VenueStats } from '../types/venue-stats';

// Las propiedades `address` y `parent` de la entidad no admiten null en su
// tipo (`?: string` / `?: Venue`), pero las columnas sí son nullable; se usan
// casts para no modificar la entidad.
export class VenueMapper {
  static toEntity(dto: CreateVenueDto, parent: Venue | null): Venue {
    const entity = new Venue();
    entity.name = dto.name;
    entity.address = (dto.address ?? null) as string;
    entity.active = true;
    entity.parent = parent as Venue;
    return entity;
  }

  static mergeEntity(
    entity: Venue,
    dto: UpdateVenueDto,
    parent?: Venue | null,
  ): Venue {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.address !== undefined) {
      entity.address = (dto.address ?? null) as string;
    }
    if (dto.active !== undefined) entity.active = dto.active;
    // parentId ausente = no cambia; null = pasa a ser escenario principal
    if (dto.parentId !== undefined) entity.parent = (parent ?? null) as Venue;
    return entity;
  }

  static toResponseDto(entity: Venue, stats: VenueStats): VenueResponseDto {
    const dto = new VenueResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.address = entity.address ?? null;
    dto.active = entity.active;

    if (entity.parent) {
      const parent = new VenueParentDto();
      parent.id = entity.parent.id;
      parent.name = entity.parent.name;
      dto.parent = parent;
    } else {
      dto.parent = null;
    }

    if (entity.children) {
      dto.children = entity.children.map((child) => {
        const item = new VenueChildDto();
        item.id = child.id;
        item.name = child.name;
        item.active = child.active;
        return item;
      });
    }

    dto.locationsCount = stats.locationsCount;
    dto.totalCapacity = stats.totalCapacity;
    return dto;
  }

  // `statsById` trae las localidades de cada escenario; si falta, cuenta 0.
  static toResponseDtoList(
    entities: Venue[],
    statsById: Map<number, VenueStats>,
  ): VenueResponseDto[] {
    return entities.map((e) =>
      VenueMapper.toResponseDto(
        e,
        statsById.get(e.id) ?? { locationsCount: 0, totalCapacity: 0 },
      ),
    );
  }
}
