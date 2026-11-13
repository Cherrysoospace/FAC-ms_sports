import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from '../entities/tournament.entity';
import { Phase } from '../../phases/entities/phase.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';
import { TournamentVenue } from '../../tournament-venues/entities/tournament-venue.entity';
import { TournamentQueryDto } from '../dto/tournament-query.dto';
import { TournamentCounts } from '../mappers/tournament.mapper';

interface CountRow {
  tournamentId: number | string;
  total: number | string;
}

// Consultas propias del módulo de torneos.
@Injectable()
export class TournamentsRepository {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(TournamentVenue)
    private readonly tournamentVenueRepository: Repository<TournamentVenue>,
  ) {}

  findByFilters(query: TournamentQueryDto): Promise<Tournament[]> {
    const qb = this.tournamentRepository
      .createQueryBuilder('tournament')
      .innerJoinAndSelect('tournament.sport', 'sport')
      .orderBy('tournament.startDate', 'DESC')
      .addOrderBy('tournament.id', 'DESC');

    if (query.sportId !== undefined) {
      qb.andWhere('sport.id = :sportId', { sportId: query.sportId });
    }
    if (query.status !== undefined) {
      qb.andWhere('tournament.status = :status', { status: query.status });
    }
    if (query.active !== undefined) {
      qb.andWhere('tournament.active = :active', { active: query.active });
    }
    if (query.search) {
      // Se escapan los comodines de LIKE para buscar el texto literal.
      const escaped = query.search.replace(/[\\%_]/g, (c) => `\\${c}`);
      qb.andWhere('LOWER(tournament.name) LIKE LOWER(:search)', {
        search: `%${escaped}%`,
      });
    }

    return qb.getMany();
  }

  findByNameAndSport(
    name: string,
    sportId: number,
    excludeId?: number,
  ): Promise<Tournament | null> {
    const qb = this.tournamentRepository
      .createQueryBuilder('tournament')
      .where('LOWER(tournament.name) = LOWER(:name)', { name })
      .andWhere('tournament.sport_id = :sportId', { sportId });

    if (excludeId !== undefined) {
      qb.andWhere('tournament.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  countActiveRegistrations(id: number): Promise<number> {
    return this.registrationRepository.count({
      where: { tournament: { id }, status: RegistrationStatus.ACTIVE },
    });
  }

  // Todas las inscripciones (también las retiradas): cualquiera bloquea la
  // eliminación por la llave foránea.
  countRegistrations(id: number): Promise<number> {
    return this.registrationRepository.count({
      where: { tournament: { id } },
    });
  }

  countPhases(id: number): Promise<number> {
    return this.phaseRepository.count({ where: { tournament: { id } } });
  }

  countTournamentVenues(id: number): Promise<number> {
    return this.tournamentVenueRepository.count({
      where: { tournament: { id } },
    });
  }

  // Conteos de inscripciones ACTIVE y fases de varios torneos en dos consultas
  // (para el listado, sin una consulta por torneo).
  async countsByTournamentIds(
    ids: number[],
  ): Promise<Map<number, TournamentCounts>> {
    const counts = new Map<number, TournamentCounts>();
    if (ids.length === 0) return counts;
    for (const id of ids) {
      counts.set(id, { registrationsCount: 0, phasesCount: 0 });
    }

    const [registrationRows, phaseRows] = await Promise.all([
      this.registrationRepository
        .createQueryBuilder('registration')
        .select('registration.tournament_id', 'tournamentId')
        .addSelect('COUNT(*)', 'total')
        .where('registration.tournament_id IN (:...ids)', { ids })
        .andWhere('registration.status = :status', {
          status: RegistrationStatus.ACTIVE,
        })
        .groupBy('registration.tournament_id')
        .getRawMany<CountRow>(),
      this.phaseRepository
        .createQueryBuilder('phase')
        .select('phase.tournament_id', 'tournamentId')
        .addSelect('COUNT(*)', 'total')
        .where('phase.tournament_id IN (:...ids)', { ids })
        .groupBy('phase.tournament_id')
        .getRawMany<CountRow>(),
    ]);

    for (const row of registrationRows) {
      const entry = counts.get(Number(row.tournamentId));
      if (entry) entry.registrationsCount = Number(row.total);
    }
    for (const row of phaseRows) {
      const entry = counts.get(Number(row.tournamentId));
      if (entry) entry.phasesCount = Number(row.total);
    }

    return counts;
  }
}
