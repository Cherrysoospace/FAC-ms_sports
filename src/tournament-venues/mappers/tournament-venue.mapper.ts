import { TournamentVenue } from '../entities/tournament-venue.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Venue } from '../../venues/entities/venue.entity';
import {
  TournamentVenueParentDto,
  TournamentVenueResponseDto,
  TournamentVenueTournamentDto,
  TournamentVenueVenueDto,
} from '../dto/tournament-venue-response.dto';

export class TournamentVenueMapper {
  static toEntity(tournament: Tournament, venue: Venue): TournamentVenue {
    const entity = new TournamentVenue();
    entity.tournament = tournament;
    entity.venue = venue;
    return entity;
  }

  // Requiere las relaciones tournament, venue y venue.parent cargadas.
  static toResponseDto(
    entity: TournamentVenue,
    scheduledMatchesCount: number,
  ): TournamentVenueResponseDto {
    const tournament = new TournamentVenueTournamentDto();
    tournament.id = entity.tournament.id;
    tournament.name = entity.tournament.name;
    tournament.status = entity.tournament.status;

    const venue = new TournamentVenueVenueDto();
    venue.id = entity.venue.id;
    venue.name = entity.venue.name;
    venue.address = entity.venue.address ?? null;
    if (entity.venue.parent) {
      const parent = new TournamentVenueParentDto();
      parent.id = entity.venue.parent.id;
      parent.name = entity.venue.parent.name;
      venue.parent = parent;
    } else {
      venue.parent = null;
    }

    const dto = new TournamentVenueResponseDto();
    dto.id = entity.id;
    dto.tournament = tournament;
    dto.venue = venue;
    dto.scheduledMatchesCount = scheduledMatchesCount;
    return dto;
  }

  // `countsByKey` usa la llave `${tournamentId}-${venueId}`; si falta, cuenta 0.
  static toResponseDtoList(
    entities: TournamentVenue[],
    countsByKey: Map<string, number>,
  ): TournamentVenueResponseDto[] {
    return entities.map((e) =>
      TournamentVenueMapper.toResponseDto(
        e,
        countsByKey.get(`${e.tournament.id}-${e.venue.id}`) ?? 0,
      ),
    );
  }
}
