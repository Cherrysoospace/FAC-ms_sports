import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { Venue } from '../venues/entities/venue.entity';
import { VenuesService } from '../venues/venues.service';
import { LocationsRepository } from './repositories/locations.repository';
import { LocationMapper } from './mappers/location.mapper';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import {
  TICKET_CAPACITY_PORT,
  type ITicketCapacityPort,
} from '../common/contracts';
import { formatCount } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly locationsRepository: LocationsRepository,
    private readonly venuesService: VenuesService,
    @Optional()
    @Inject(TICKET_CAPACITY_PORT)
    private readonly ticketCapacityPort?: ITicketCapacityPort,
  ) {}

  async findAll(query: LocationQueryDto): Promise<LocationResponseDto[]> {
    const locations = await this.locationsRepository.findByFilters(query);
    return LocationMapper.toResponseDtoList(locations);
  }

  async findOne(id: number): Promise<LocationResponseDto> {
    const location = await this.getLocationOrFail(id);
    return LocationMapper.toResponseDto(location);
  }

  // Lo usará el módulo de Boleto. Carga el escenario.
  async getLocationOrFail(id: number): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: { venue: true },
    });
    if (!location) throw ResourceNotFoundException.of('Localidad', id);
    return location;
  }

  async create(dto: CreateLocationDto): Promise<LocationResponseDto> {
    const venue = await this.venuesService.getVenueOrFail(dto.venueId);
    if (!venue.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario ${venue.name} está inactivo`,
      );
    }
    await this.assertNameAvailable(venue, dto.name);

    const saved = await this.locationRepository.save(
      LocationMapper.toEntity(dto, venue),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.getLocationOrFail(id);

    if (dto.name !== undefined && dto.name !== location.name) {
      await this.assertNameAvailable(location.venue, dto.name, id);
    }

    if (dto.capacity !== undefined && this.ticketCapacityPort) {
      const maxSold =
        await this.ticketCapacityPort.maxSoldPerMatchByLocationId(id);
      if (dto.capacity < maxSold) {
        throw new BusinessRuleException(
          `No se puede reducir la capacidad de ${location.name} a ${dto.capacity} ` +
            `porque ya tiene ${formatCount(maxSold, 'boleto vendido', 'boletos vendidos')} ` +
            'en un mismo partido',
        );
      }
    }

    await this.locationRepository.save(
      LocationMapper.mergeEntity(location, dto),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const location = await this.getLocationOrFail(id);
    if (this.ticketCapacityPort) {
      const soldTickets = await this.ticketCapacityPort.countByLocationId(id);
      if (soldTickets > 0) {
        throw new BusinessRuleException(
          `No se puede eliminar la localidad porque tiene ${formatCount(soldTickets, 'boleto vendido', 'boletos vendidos')} ` +
            'asociados. Desactívela con PATCH { "active": false }',
        );
      }
    }

    await this.locationRepository.remove(location);
    return { message: `Localidad #${id} eliminada correctamente` };
  }

  private async assertNameAvailable(
    venue: Venue,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.locationsRepository.findByVenueAndName(
      venue.id,
      name,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe la localidad ${existing.name} en ${venue.name}`,
      );
    }
  }
}
