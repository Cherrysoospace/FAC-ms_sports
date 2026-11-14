import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';
import { LocationQueryDto } from '../dto/location-query.dto';

// Consultas propias del módulo de localidades.
@Injectable()
export class LocationsRepository {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  findByFilters(query: LocationQueryDto): Promise<Location[]> {
    const qb = this.locationRepository
      .createQueryBuilder('location')
      .innerJoinAndSelect('location.venue', 'venue')
      .orderBy('venue.name', 'ASC')
      .addOrderBy('location.name', 'ASC');

    if (query.venueId !== undefined) {
      qb.andWhere('venue.id = :venueId', { venueId: query.venueId });
    }
    if (query.active !== undefined) {
      qb.andWhere('location.active = :active', { active: query.active });
    }

    return qb.getMany();
  }

  // Localidad con ese nombre en el escenario, sin distinguir mayúsculas.
  findByVenueAndName(
    venueId: number,
    name: string,
    excludeId?: number,
  ): Promise<Location | null> {
    const qb = this.locationRepository
      .createQueryBuilder('location')
      .where('location.venue_id = :venueId', { venueId })
      .andWhere('LOWER(location.name) = LOWER(:name)', { name });

    if (excludeId !== undefined) {
      qb.andWhere('location.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }
}
