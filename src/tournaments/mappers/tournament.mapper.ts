import { Tournament } from '../entities/tournament.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { TournamentStatus } from '../enums/tournament-status.enum';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';
import {
  TournamentResponseDto,
  TournamentSportDto,
} from '../dto/tournament-response.dto';

export interface TournamentCounts {
  registrationsCount: number;
  phasesCount: number;
}

export class TournamentMapper {
  static toEntity(dto: CreateTournamentDto, sport: Sport): Tournament {
    const entity = new Tournament();
    entity.name = dto.name;
    entity.sport = sport;
    entity.startDate = dto.startDate;
    entity.endDate = dto.endDate;
    entity.registrationOpensAt = new Date(dto.registrationOpensAt);
    entity.registrationClosesAt = new Date(dto.registrationClosesAt);
    entity.status = TournamentStatus.PLANNED;
    entity.active = true;
    return entity;
  }

  // `sport` solo se pasa cuando cambia el deporte.
  static mergeEntity(
    entity: Tournament,
    dto: UpdateTournamentDto,
    sport?: Sport,
  ): Tournament {
    if (dto.name !== undefined) entity.name = dto.name;
    if (sport) entity.sport = sport;
    if (dto.startDate !== undefined) entity.startDate = dto.startDate;
    if (dto.endDate !== undefined) entity.endDate = dto.endDate;
    if (dto.registrationOpensAt !== undefined) {
      entity.registrationOpensAt = new Date(dto.registrationOpensAt);
    }
    if (dto.registrationClosesAt !== undefined) {
      entity.registrationClosesAt = new Date(dto.registrationClosesAt);
    }
    if (dto.status !== undefined) entity.status = dto.status;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  static toResponseDto(
    entity: Tournament,
    counts: TournamentCounts,
  ): TournamentResponseDto {
    const sport = new TournamentSportDto();
    sport.id = entity.sport.id;
    sport.name = entity.sport.name;

    const dto = new TournamentResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.sport = sport;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.registrationOpensAt = entity.registrationOpensAt;
    dto.registrationClosesAt = entity.registrationClosesAt;
    dto.status = entity.status;
    dto.active = entity.active;
    dto.registrationsCount = counts.registrationsCount;
    dto.phasesCount = counts.phasesCount;
    return dto;
  }

  // `countsById` trae los conteos de cada torneo; si falta, cuenta 0.
  static toResponseDtoList(
    entities: Tournament[],
    countsById: Map<number, TournamentCounts>,
  ): TournamentResponseDto[] {
    return entities.map((e) =>
      TournamentMapper.toResponseDto(
        e,
        countsById.get(e.id) ?? { registrationsCount: 0, phasesCount: 0 },
      ),
    );
  }
}
