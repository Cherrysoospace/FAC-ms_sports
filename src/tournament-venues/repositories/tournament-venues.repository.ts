import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TournamentVenue } from '../entities/tournament-venue.entity';
import { Match } from '../../matches/entities/match.entity';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { TournamentVenueQueryDto } from '../dto/tournament-venue-query.dto';

interface CountRow {
  tournamentId: number | string;
  venueId: number | string;
  total: number | string;
}

// Consultas propias del módulo de escenarios del torneo.
@Injectable()
export class TournamentVenuesRepository {
  constructor(
    @InjectRepository(TournamentVenue)
    private readonly tournamentVenueRepository: Repository<TournamentVenue>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  findByFilters(query: TournamentVenueQueryDto): Promise<TournamentVenue[]> {
    const qb = this.tournamentVenueRepository
      .createQueryBuilder('tournamentVenue')
      .innerJoinAndSelect('tournamentVenue.tournament', 'tournament')
      .innerJoinAndSelect('tournamentVenue.venue', 'venue')
      .leftJoinAndSelect('venue.parent', 'parent')
      .orderBy('tournament.startDate', 'DESC')
      .addOrderBy('venue.name', 'ASC');

    if (query.tournamentId !== undefined) {
      qb.andWhere('tournament.id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    }
    if (query.venueId !== undefined) {
      qb.andWhere('venue.id = :venueId', { venueId: query.venueId });
    }

    return qb.getMany();
  }

  existsAssociation(tournamentId: number, venueId: number): Promise<boolean> {
    return this.tournamentVenueRepository.exists({
      where: { tournament: { id: tournamentId }, venue: { id: venueId } },
    });
  }

  // ¿El torneo tiene habilitado alguno de esos escenarios?
  existsAnyVenue(tournamentId: number, venueIds: number[]): Promise<boolean> {
    return this.tournamentVenueRepository.exists({
      where: { tournament: { id: tournamentId }, venue: { id: In(venueIds) } },
    });
  }

  // Escenarios habilitados de cada torneo, en una sola consulta.
  async venueIdsByTournamentIds(
    tournamentIds: number[],
  ): Promise<Map<number, Set<number>>> {
    const venues = new Map<number, Set<number>>();
    if (tournamentIds.length === 0) return venues;

    const rows = await this.tournamentVenueRepository
      .createQueryBuilder('tournamentVenue')
      .select('tournamentVenue.tournament_id', 'tournamentId')
      .addSelect('tournamentVenue.venue_id', 'venueId')
      .where('tournamentVenue.tournament_id IN (:...tournamentIds)', {
        tournamentIds,
      })
      .getRawMany<{ tournamentId: number | string; venueId: number | string }>();

    for (const row of rows) {
      const tournamentId = Number(row.tournamentId);
      const set = venues.get(tournamentId) ?? new Set<number>();
      set.add(Number(row.venueId));
      venues.set(tournamentId, set);
    }
    return venues;
  }

  /**
   * Partidos no CANCELLED por torneo y escenario, en una sola consulta.
   * Llave del mapa: `${tournamentId}-${venueId}`. El torneo del partido se
   * obtiene por su fase.
   */
  async countActiveMatchesByTournamentAndVenue(
    tournamentIds: number[],
  ): Promise<Map<string, number>> {
    if (tournamentIds.length === 0) return new Map();

    const qb = this.matchRepository
      .createQueryBuilder('match')
      .innerJoin('match.phase', 'phase')
      .select('phase.tournament_id', 'tournamentId')
      .addSelect('match.venue_id', 'venueId')
      .addSelect('COUNT(*)', 'total')
      .where('phase.tournament_id IN (:...tournamentIds)', { tournamentIds })
      .andWhere('match.venue_id IS NOT NULL')
      .andWhere('match.status <> :cancelled', {
        cancelled: MatchStatus.CANCELLED,
      })
      .groupBy('phase.tournament_id')
      .addGroupBy('match.venue_id');

    const rows = await qb.getRawMany<CountRow>();
    return new Map(
      rows.map((row) => [
        `${Number(row.tournamentId)}-${Number(row.venueId)}`,
        Number(row.total),
      ]),
    );
  }
}
