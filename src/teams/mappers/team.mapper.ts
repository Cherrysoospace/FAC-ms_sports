import { Team } from '../entities/team.entity';
import { TeamModality } from '../enums/team-modality.enum';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import {
  TeamGroupDto,
  TeamResponseDto,
  TeamSportSummaryDto,
} from '../dto/team-response.dto';

export const TEAM_MODALITY_LABELS: Record<TeamModality, string> = {
  [TeamModality.MALE]: 'masculina',
  [TeamModality.FEMALE]: 'femenina',
  [TeamModality.MIXED]: 'mixta',
};

// Datos que no vienen en la entidad: los calcula el repositorio.
export interface TeamExtras {
  sports: TeamSportSummaryDto[];
  activeRegistrationsCount: number;
}

export class TeamMapper {
  static toEntity(dto: CreateTeamDto): Team {
    const entity = new Team();
    entity.name = dto.name;
    entity.city = dto.city;
    entity.modality = dto.modality;
    entity.active = true;
    return entity;
  }

  static mergeEntity(entity: Team, dto: UpdateTeamDto): Team {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.city !== undefined) entity.city = dto.city;
    if (dto.modality !== undefined) entity.modality = dto.modality;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  // Requiere la relación group (y group.tournament) cargada.
  static toResponseDto(entity: Team, extras: TeamExtras): TeamResponseDto {
    const dto = new TeamResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.city = entity.city;
    dto.modality = entity.modality;
    dto.active = entity.active;
    dto.sports = extras.sports;
    dto.activeRegistrationsCount = extras.activeRegistrationsCount;

    if (entity.group) {
      const group = new TeamGroupDto();
      group.id = entity.group.id;
      group.groupName = entity.group.groupName;
      group.tournamentId = entity.group.tournament.id;
      dto.group = group;
    } else {
      dto.group = null;
    }
    return dto;
  }

  // `extrasById` trae los datos de cada equipo; si falta, sin deportes y 0.
  static toResponseDtoList(
    entities: Team[],
    extrasById: Map<number, TeamExtras>,
  ): TeamResponseDto[] {
    return entities.map((e) =>
      TeamMapper.toResponseDto(
        e,
        extrasById.get(e.id) ?? { sports: [], activeRegistrationsCount: 0 },
      ),
    );
  }
}
