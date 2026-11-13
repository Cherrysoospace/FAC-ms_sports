import { FinalPhase } from '../entities/final-phase.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { CreateFinalPhaseDto } from '../dto/create-final-phase.dto';
import { UpdateFinalPhaseDto } from '../dto/update-final-phase.dto';
import { FinalPhaseResponseDto } from '../dto/final-phase-response.dto';
import { PhaseTournamentDto } from '../dto/phase-tournament.dto';

// `startDate` y `endDate` no admiten null en el tipo de la entidad, pero las
// columnas sí son nullable; se usan casts para no modificar la entidad.
export class FinalPhaseMapper {
  static toEntity(dto: CreateFinalPhaseDto, tournament: Tournament): FinalPhase {
    const entity = new FinalPhase();
    entity.tournament = tournament;
    entity.name = dto.name;
    entity.order = dto.order;
    entity.round = dto.round;
    entity.startDate = (dto.startDate ?? null) as string;
    entity.endDate = (dto.endDate ?? null) as string;
    return entity;
  }

  static mergeEntity(entity: FinalPhase, dto: UpdateFinalPhaseDto): FinalPhase {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.order !== undefined) entity.order = dto.order;
    if (dto.round !== undefined) entity.round = dto.round;
    if (dto.startDate !== undefined) {
      entity.startDate = (dto.startDate ?? null) as string;
    }
    if (dto.endDate !== undefined) {
      entity.endDate = (dto.endDate ?? null) as string;
    }
    return entity;
  }

  static toResponseDto(
    entity: FinalPhase,
    matchesCount: number,
  ): FinalPhaseResponseDto {
    const tournament = new PhaseTournamentDto();
    tournament.id = entity.tournament.id;
    tournament.name = entity.tournament.name;

    const dto = new FinalPhaseResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.order = entity.order;
    dto.round = entity.round;
    dto.startDate = entity.startDate ?? null;
    dto.endDate = entity.endDate ?? null;
    dto.tournament = tournament;
    dto.matchesCount = matchesCount;
    return dto;
  }

  // `matchesById` trae los partidos de cada fase; si falta, cuenta 0.
  static toResponseDtoList(
    entities: FinalPhase[],
    matchesById: Map<number, number>,
  ): FinalPhaseResponseDto[] {
    return entities.map((e) =>
      FinalPhaseMapper.toResponseDto(e, matchesById.get(e.id) ?? 0),
    );
  }
}
