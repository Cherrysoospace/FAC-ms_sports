import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { VenuesRepository } from './repositories/venues.repository';
import { VenueMapper } from './mappers/venue.mapper';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueQueryDto } from './dto/venue-query.dto';
import { VenueResponseDto } from './dto/venue-response.dto';
import { joinList, plural } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    private readonly venuesRepository: VenuesRepository,
  ) {}

  async findAll(query: VenueQueryDto): Promise<VenueResponseDto[]> {
    if (query.roots === true && query.parentId !== undefined) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Use roots o parentId, no ambos',
      );
    }
    const venues = await this.venuesRepository.findByFilters(query);
    const stats = await this.venuesRepository.locationStatsByVenueIds(
      venues.map((v) => v.id),
    );
    return VenueMapper.toResponseDtoList(venues, stats);
  }

  async findOne(id: number): Promise<VenueResponseDto> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: { parent: true, children: true },
      order: { children: { name: 'ASC' } },
    });
    if (!venue) throw ResourceNotFoundException.of('Escenario', id);
    const stats = await this.venuesRepository.locationStatsByVenueIds([id]);
    return VenueMapper.toResponseDto(
      venue,
      stats.get(id) ?? { locationsCount: 0, totalCapacity: 0 },
    );
  }

  // Lo usan Partido, Escenario-Torneo y Localidad. Carga el padre.
  async getVenueOrFail(id: number): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!venue) throw ResourceNotFoundException.of('Escenario', id);
    return venue;
  }

  // Ids de los escenarios que contienen a `id` (padre, abuelo... hasta la
  // raíz). Lo usa Escenario-Torneo para heredar la habilitación del complejo.
  findAncestorIds(id: number): Promise<number[]> {
    return this.venuesRepository.findAncestorIds(id);
  }

  async create(dto: CreateVenueDto): Promise<VenueResponseDto> {
    const parent =
      dto.parentId != null ? await this.getActiveParent(dto.parentId) : null;
    await this.assertNameAvailable(dto.name, parent);

    const saved = await this.venueRepository.save(
      VenueMapper.toEntity(dto, parent),
    );
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateVenueDto): Promise<VenueResponseDto> {
    // getVenueOrFail carga la relación parent, así se puede comparar.
    const venue = await this.getVenueOrFail(id);
    const currentParent = venue.parent ?? null;
    let changes: UpdateVenueDto = dto;
    let parent: Venue | null = null;
    let finalParent: Venue | null = currentParent;

    if (
      typeof dto.parentId === 'number' &&
      dto.parentId === currentParent?.id
    ) {
      // Mismo padre: no se valida ni se reasigna.
      changes = Object.assign(new UpdateVenueDto(), dto, {
        parentId: undefined,
      });
    } else if (typeof dto.parentId === 'number') {
      const newParentId = dto.parentId;
      const ancestors =
        await this.venuesRepository.findAncestorIds(newParentId);
      if (newParentId === id || ancestors.includes(id)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          'Un escenario no puede quedar dentro de sí mismo ni de sus espacios internos',
        );
      }
      parent = await this.getActiveParent(newParentId);
      finalParent = parent;
    } else if (dto.parentId === null) {
      finalParent = null;
    }

    // a) Nombre único entre hermanos (con el nombre y el padre finales).
    const nameChanges = dto.name !== undefined && dto.name !== venue.name;
    const parentChanges =
      (finalParent?.id ?? null) !== (currentParent?.id ?? null);
    if (nameChanges || parentChanges) {
      await this.assertNameAvailable(dto.name ?? venue.name, finalParent, id);
    }

    // c) Desactivar: sin partidos pendientes ni espacios internos activos.
    if (dto.active === false && venue.active) {
      const pending = await this.venuesRepository.countPendingMatches(id);
      if (pending > 0) {
        throw new BusinessRuleException(
          `No se puede desactivar: el escenario tiene ${pending} ` +
            `${pending === 1 ? 'partido programado o en curso' : 'partidos programados o en curso'}`,
        );
      }
      const activeChildren =
        await this.venuesRepository.countActiveChildren(id);
      if (activeChildren > 0) {
        throw new BusinessRuleException(
          'Desactive primero sus espacios internos',
        );
      }
    }

    await this.venueRepository.save(
      VenueMapper.mergeEntity(venue, changes, parent),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const venue = await this.getVenueOrFail(id);

    const [children, locations, matches, tournaments] = await Promise.all([
      this.venuesRepository.countChildren(id),
      this.venuesRepository.countLocations(id),
      this.venuesRepository.countMatches(id),
      this.venuesRepository.countTournamentVenues(id),
    ]);

    const dependencies = [
      plural(children, 'espacio interno', 'espacios internos'),
      plural(locations, 'localidad', 'localidades'),
      plural(matches, 'partido', 'partidos'),
      plural(tournaments, 'torneo', 'torneos'),
    ].filter((d): d is string => d !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar porque tiene ${joinList(dependencies)} ` +
          'asociados. Desactívelo con PATCH { "active": false }',
      );
    }

    await this.venueRepository.remove(venue);
    return { message: `Escenario #${id} eliminado correctamente` };
  }

  private async getActiveParent(parentId: number): Promise<Venue> {
    const parent = await this.venueRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) throw ResourceNotFoundException.of('Escenario', parentId);
    if (!parent.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El escenario padre está inactivo',
      );
    }
    return parent;
  }

  private async assertNameAvailable(
    name: string,
    parent: Venue | null,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.venuesRepository.findSiblingByName(
      name,
      parent?.id ?? null,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        parent
          ? `Ya existe el escenario ${name} dentro de ${parent.name}`
          : `Ya existe el escenario ${name} como escenario principal`,
      );
    }
  }
}
