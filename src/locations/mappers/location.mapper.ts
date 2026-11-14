import { Location } from '../entities/location.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import {
  LocationResponseDto,
  LocationVenueDto,
} from '../dto/location-response.dto';

export class LocationMapper {
  static toEntity(dto: CreateLocationDto, venue: Venue): Location {
    const entity = new Location();
    entity.venue = venue;
    entity.name = dto.name;
    entity.capacity = dto.capacity;
    entity.active = true;
    return entity;
  }

  static mergeEntity(entity: Location, dto: UpdateLocationDto): Location {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.capacity !== undefined) entity.capacity = dto.capacity;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  // Requiere la relación venue cargada.
  static toResponseDto(entity: Location): LocationResponseDto {
    const venue = new LocationVenueDto();
    venue.id = entity.venue.id;
    venue.name = entity.venue.name;

    const dto = new LocationResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.capacity = entity.capacity;
    dto.active = entity.active;
    dto.venue = venue;
    return dto;
  }

  static toResponseDtoList(entities: Location[]): LocationResponseDto[] {
    return entities.map((e) => LocationMapper.toResponseDto(e));
  }
}
