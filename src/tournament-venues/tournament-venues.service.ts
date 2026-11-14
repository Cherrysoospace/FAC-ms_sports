import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentVenue } from './entities/tournament-venue.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentStatusPolicy } from '../tournaments/policies/tournament-status.policy';
import { TournamentsService } from '../tournaments/tournaments.service';
import { VenuesService } from '../venues/venues.service';
import { TournamentVenuesRepository } from './repositories/tournament-venues.repository';
import { TournamentVenueMapper } from './mappers/tournament-venue.mapper';
import { CreateTournamentVenueDto } from './dto/create-tournament-venue.dto';
import { TournamentVenueQueryDto } from './dto/tournament-venue-query.dto';
import { TournamentVenueResponseDto } from './dto/tournament-venue-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class TournamentVenuesService {
  constructor(
    @InjectRepository(TournamentVenue)
    private readonly tournamentVenueRepository: Repository<TournamentVenue>,
    private readonly tournamentVenuesRepository: TournamentVenuesRepository,
    private readonly tournamentsService: TournamentsService,
    private readonly venuesService: VenuesService,
  ) {}

  // ?tournamentId → escenarios del torneo; ?venueId → torneos que usan el escenario.
  async findAll(
    query: TournamentVenueQueryDto,
  ): Promise<TournamentVenueResponseDto[]> {
    const associations =
      await this.tournamentVenuesRepository.findByFilters(query);
    const counts = await this.countScheduledMatches(
      associations.map((a) => ({
        tournamentId: a.tournament.id,
        venueId: a.venue.id,
      })),
    );
    return TournamentVenueMapper.toResponseDtoList(associations, counts);
  }

  async findOne(id: number): Promise<TournamentVenueResponseDto> {
    const association = await this.getTournamentVenueOrFail(id);
    return TournamentVenueMapper.toResponseDto(
      association,
      await this.countScheduledMatchesFor(
        association.tournament.id,
        association.venue.id,
      ),
    );
  }

  async create(
    dto: CreateTournamentVenueDto,
  ): Promise<TournamentVenueResponseDto> {
    const tournament = await this.tournamentsService.getTournamentOrFail(
      dto.tournamentId,
    );
    this.assertTournamentEditable(tournament);

    const venue = await this.venuesService.getVenueOrFail(dto.venueId);
    if (!venue.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario ${venue.name} está inactivo`,
      );
    }

    if (
      await this.tournamentVenuesRepository.existsAssociation(
        tournament.id,
        venue.id,
      )
    ) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El escenario ${venue.name} ya está habilitado para el torneo ${tournament.name}`,
      );
    }

    const saved = await this.tournamentVenueRepository.save(
      TournamentVenueMapper.toEntity(tournament, venue),
    );
    return this.findOne(saved.id);
  }

  // Retira solo la asociación: no borra el torneo ni el escenario.
  async remove(id: number): Promise<{ message: string }> {
    const association = await this.getTournamentVenueOrFail(id);
    const { tournament, venue } = association;
    this.assertTournamentEditable(tournament);

    // Misma regla que scheduledMatchesCount (ver countScheduledMatches).
    const matches = await this.countScheduledMatchesFor(
      tournament.id,
      venue.id,
    );
    if (matches > 0) {
      throw new BusinessRuleException(
        `No se puede retirar: hay ${matches} ` +
          `${matches === 1 ? 'partido' : 'partidos'} del torneo programados en ${venue.name}`,
      );
    }

    await this.tournamentVenueRepository.remove(association);
    return {
      message: `Se retiró ${venue.name} de los escenarios del torneo ${tournament.name}`,
    };
  }

  /**
   * Lo usa el módulo de Partido. true si el escenario o alguno de sus
   * ancestros (el complejo que lo contiene) está habilitado para el torneo:
   * si el Coliseo está habilitado, su cancha interna también.
   */
  async isVenueEnabledForTournament(
    tournamentId: number,
    venueId: number,
  ): Promise<boolean> {
    const ancestors = await this.venuesService.findAncestorIds(venueId);
    return this.tournamentVenuesRepository.existsAnyVenue(tournamentId, [
      venueId,
      ...ancestors,
    ]);
  }

  private async countScheduledMatchesFor(
    tournamentId: number,
    venueId: number,
  ): Promise<number> {
    const counts = await this.countScheduledMatches([
      { tournamentId, venueId },
    ]);
    return counts.get(`${tournamentId}-${venueId}`) ?? 0;
  }

  /**
   * Partidos no CANCELLED del torneo que dependen de cada asociación: los del
   * escenario y los de sus espacios internos. Un partido en un espacio interno
   * NO cuenta si ese espacio (o un escenario intermedio) tiene su propia
   * asociación con el torneo, porque seguiría habilitado sin este escenario.
   *
   * Es la regla de scheduledMatchesCount y del bloqueo al retirar.
   * Llave del mapa: `${tournamentId}-${venueId}`.
   */
  private async countScheduledMatches(
    pairs: { tournamentId: number; venueId: number }[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (pairs.length === 0) return result;

    const tournamentIds = [...new Set(pairs.map((p) => p.tournamentId))];
    const [matchCounts, enabledByTournament] = await Promise.all([
      this.tournamentVenuesRepository.countActiveMatchesByTournamentAndVenue(
        tournamentIds,
      ),
      this.tournamentVenuesRepository.venueIdsByTournamentIds(tournamentIds),
    ]);

    // Ruta de cada escenario con partidos: [escenario, padre, abuelo, ...]
    const matchVenueIds = [
      ...new Set(
        [...matchCounts.keys()].map((key) => Number(key.split('-')[1])),
      ),
    ];
    const pathByVenue = new Map<number, number[]>(
      await Promise.all(
        matchVenueIds.map(async (id): Promise<[number, number[]]> => [
          id,
          [id, ...(await this.venuesService.findAncestorIds(id))],
        ]),
      ),
    );

    for (const { tournamentId, venueId } of pairs) {
      const enabled =
        enabledByTournament.get(tournamentId) ?? new Set<number>();
      let total = 0;

      for (const [key, count] of matchCounts) {
        const [matchTournamentId, matchVenueId] = key.split('-').map(Number);
        if (matchTournamentId !== tournamentId) continue;

        const path = pathByVenue.get(matchVenueId) ?? [matchVenueId];
        const position = path.indexOf(venueId);
        if (position === -1) continue;

        // El partido sigue habilitado sin esta asociación si otro escenario de
        // su ruta está habilitado: un espacio intermedio entre el partido y
        // este, o un ancestro de este (el complejo que lo contiene).
        const coveredElsewhere = path.some(
          (id, index) => index !== position && enabled.has(id),
        );
        if (!coveredElsewhere) total += count;
      }

      result.set(`${tournamentId}-${venueId}`, total);
    }

    return result;
  }

  private async getTournamentVenueOrFail(id: number): Promise<TournamentVenue> {
    const association = await this.tournamentVenueRepository.findOne({
      where: { id },
      relations: { tournament: true, venue: { parent: true } },
    });
    if (!association) {
      throw ResourceNotFoundException.of('Escenario del torneo', id);
    }
    return association;
  }

  // Los escenarios de un torneo cerrado (FINISHED o CANCELLED) ya no cambian.
  private assertTournamentEditable(tournament: Tournament): void {
    if (TournamentStatusPolicy.isClosed(tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se pueden cambiar los escenarios de un torneo finalizado o cancelado',
      );
    }
  }
}
