import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Venue } from '../entities/venue.entity';
import { Location } from '../../locations/entities/location.entity';
import { Match } from '../../matches/entities/match.entity';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { TournamentVenue } from '../../tournament-venues/entities/tournament-venue.entity';
import { VenueQueryDto } from '../dto/venue-query.dto';
import { VenueStats } from '../types/venue-stats';
import { escapeLike } from '../../common/database/query.util';
import { findAncestorIdsMany } from '../../common/database/hierarchy.util';

interface StatsRow {
  id: number | string;
  total: number | string;
  capacity: number | string | null;
}

// Partidos que todavía usan el escenario.
const PENDING_MATCH_STATUSES = [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS];

// Consultas propias del módulo de escenarios.
@Injectable()
export class VenuesRepository {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(TournamentVenue)
    private readonly tournamentVenueRepository: Repository<TournamentVenue>,
  ) {}

  findByFilters(query: VenueQueryDto): Promise<Venue[]> {
    const qb = this.venueRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.parent', 'parent')
      .orderBy('venue.name', 'ASC');

    if (query.search) {
      qb.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.parentId !== undefined) {
      qb.andWhere('parent.id = :parentId', { parentId: query.parentId });
    }
    if (query.roots === true) {
      qb.andWhere('venue.parent IS NULL');
    }
    if (query.active !== undefined) {
      qb.andWhere('venue.active = :active', { active: query.active });
    }

    return qb.getMany();
  }

  // Escenario con ese nombre entre los hermanos (mismo padre, o ambos raíz).
  findSiblingByName(
    name: string,
    parentId: number | null,
    excludeId?: number,
  ): Promise<Venue | null> {
    const qb = this.venueRepository
      .createQueryBuilder('venue')
      .where('LOWER(venue.name) = LOWER(:name)', { name });

    if (parentId === null) {
      qb.andWhere('venue.parent_id IS NULL');
    } else {
      qb.andWhere('venue.parent_id = :parentId', { parentId });
    }
    if (excludeId !== undefined) {
      qb.andWhere('venue.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  // Ids de los ancestros de `id` (padre, abuelo, ... hasta la raíz), en una
  // sola consulta. Se corta si encuentra un id repetido (ciclo en datos).
  async findAncestorIds(id: number): Promise<number[]> {
    return (await this.findAncestorIdsMany([id])).get(id) ?? [];
  }

  // Lo mismo para varios ids a la vez, también en una sola consulta.
  findAncestorIdsMany(ids: readonly number[]): Promise<Map<number, number[]>> {
    return findAncestorIdsMany(this.venueRepository, ids);
  }

  // Localidades (todas) y capacidad total (solo las activas) por escenario,
  // en una sola consulta.
  async locationStatsByVenueIds(
    ids: number[],
  ): Promise<Map<number, VenueStats>> {
    if (ids.length === 0) return new Map();
    const rows = await this.locationRepository
      .createQueryBuilder('location')
      .select('location.venue_id', 'id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN location.active = 1 THEN location.capacity ELSE 0 END)',
        'capacity',
      )
      .where('location.venue_id IN (:...ids)', { ids })
      .groupBy('location.venue_id')
      .getRawMany<StatsRow>();
    return new Map(
      rows.map((row) => [
        Number(row.id),
        {
          locationsCount: Number(row.total),
          totalCapacity: Number(row.capacity ?? 0),
        },
      ]),
    );
  }

  countChildren(id: number): Promise<number> {
    return this.venueRepository.count({ where: { parent: { id } } });
  }

  countActiveChildren(id: number): Promise<number> {
    return this.venueRepository.count({
      where: { parent: { id }, active: true },
    });
  }

  countLocations(id: number): Promise<number> {
    return this.locationRepository.count({ where: { venue: { id } } });
  }

  countMatches(id: number): Promise<number> {
    return this.matchRepository.count({ where: { venue: { id } } });
  }

  // Partidos programados o en curso en el escenario.
  countPendingMatches(id: number): Promise<number> {
    return this.matchRepository.count({
      where: { venue: { id }, status: In(PENDING_MATCH_STATUSES) },
    });
  }

  countTournamentVenues(id: number): Promise<number> {
    return this.tournamentVenueRepository.count({
      where: { venue: { id } },
    });
  }
}
