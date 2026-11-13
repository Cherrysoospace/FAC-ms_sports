import { GroupPhase } from '../entities/group-phase.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Team } from '../../teams/entities/team.entity';
import { CreateGroupPhaseDto } from '../dto/create-group-phase.dto';
import { UpdateGroupPhaseDto } from '../dto/update-group-phase.dto';
import { GroupPhaseResponseDto } from '../dto/group-phase-response.dto';
import { GroupTeamResponseDto } from '../dto/group-team-response.dto';
import { PhaseTournamentDto } from '../dto/phase-tournament.dto';

export interface GroupPhaseCounts {
  teamsCount: number;
  matchesCount: number;
}

// `qualifiersCount`, `startDate` y `endDate` no admiten null en el tipo de la
// entidad, pero las columnas sí son nullable; se usan casts para no
// modificar la entidad.
export class GroupPhaseMapper {
  static toEntity(dto: CreateGroupPhaseDto, tournament: Tournament): GroupPhase {
    const entity = new GroupPhase();
    entity.tournament = tournament;
    entity.name = dto.name;
    entity.order = dto.order;
    entity.groupName = dto.groupName;
    entity.qualifiersCount = (dto.qualifiersCount ?? null) as number;
    entity.startDate = (dto.startDate ?? null) as string;
    entity.endDate = (dto.endDate ?? null) as string;
    return entity;
  }

  static mergeEntity(entity: GroupPhase, dto: UpdateGroupPhaseDto): GroupPhase {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.order !== undefined) entity.order = dto.order;
    if (dto.groupName !== undefined) entity.groupName = dto.groupName;
    if (dto.qualifiersCount !== undefined) {
      entity.qualifiersCount = (dto.qualifiersCount ?? null) as number;
    }
    if (dto.startDate !== undefined) {
      entity.startDate = (dto.startDate ?? null) as string;
    }
    if (dto.endDate !== undefined) {
      entity.endDate = (dto.endDate ?? null) as string;
    }
    return entity;
  }

  static toResponseDto(
    entity: GroupPhase,
    counts: GroupPhaseCounts,
  ): GroupPhaseResponseDto {
    const tournament = new PhaseTournamentDto();
    tournament.id = entity.tournament.id;
    tournament.name = entity.tournament.name;

    const dto = new GroupPhaseResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.order = entity.order;
    dto.groupName = entity.groupName;
    dto.qualifiersCount = entity.qualifiersCount ?? null;
    dto.startDate = entity.startDate ?? null;
    dto.endDate = entity.endDate ?? null;
    dto.tournament = tournament;
    dto.teamsCount = counts.teamsCount;
    dto.matchesCount = counts.matchesCount;
    return dto;
  }

  // `countsById` trae los conteos de cada grupo; si falta, cuenta 0.
  static toResponseDtoList(
    entities: GroupPhase[],
    countsById: Map<number, GroupPhaseCounts>,
  ): GroupPhaseResponseDto[] {
    return entities.map((e) =>
      GroupPhaseMapper.toResponseDto(
        e,
        countsById.get(e.id) ?? { teamsCount: 0, matchesCount: 0 },
      ),
    );
  }

  static toTeamResponseDto(team: Team): GroupTeamResponseDto {
    const dto = new GroupTeamResponseDto();
    dto.id = team.id;
    dto.name = team.name;
    dto.city = team.city;
    dto.modality = team.modality;
    return dto;
  }

  static toTeamResponseDtoList(teams: Team[]): GroupTeamResponseDto[] {
    return teams.map((t) => GroupPhaseMapper.toTeamResponseDto(t));
  }
}
