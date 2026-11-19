import { TeamPlayer } from '../entities/team-player.entity';
import { Team } from '../../teams/entities/team.entity';
import { Player } from '../../players/entities/player.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { CreateTeamPlayerDto } from '../dto/create-team-player.dto';
import { UpdateTeamPlayerDto } from '../dto/update-team-player.dto';
import { PlayerAgePolicy } from '../../players/policies/player-age.policy';
import { ContractPeriodPolicy } from '../policies/contract-period.policy';
import {
  TeamPlayerPlayerDto,
  TeamPlayerResponseDto,
  TeamPlayerTeamDto,
} from '../dto/team-player-response.dto';

export class TeamPlayerMapper {
  static toEntity(
    team: Team,
    player: Player,
    dto: CreateTeamPlayerDto,
  ): TeamPlayer {
    const entity = new TeamPlayer();
    entity.team = team;
    entity.player = player;
    entity.startDate = dto.startDate;
    entity.endDate = dto.endDate;
    entity.status = ContractStatus.ACTIVE;
    entity.releaseDate = null;
    entity.releaseReason = null;
    return entity;
  }

  static mergeEntity(entity: TeamPlayer, dto: UpdateTeamPlayerDto): TeamPlayer {
    if (dto.startDate !== undefined) entity.startDate = dto.startDate;
    if (dto.endDate !== undefined) entity.endDate = dto.endDate;
    return entity;
  }

  // Requiere las relaciones team y player cargadas.
  static toResponseDto(entity: TeamPlayer): TeamPlayerResponseDto {
    const team = new TeamPlayerTeamDto();
    team.id = entity.team.id;
    team.name = entity.team.name;
    team.city = entity.team.city;
    team.modality = entity.team.modality;

    const player = new TeamPlayerPlayerDto();
    player.id = entity.player.id;
    player.fullName = entity.player.fullName;
    player.documentNumber = entity.player.documentNumber;
    player.position = entity.player.position;
    player.age = PlayerAgePolicy.ageOn(entity.player.birthDate);

    const dto = new TeamPlayerResponseDto();
    dto.id = entity.id;
    dto.team = team;
    dto.player = player;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.status = entity.status;
    dto.stage = ContractPeriodPolicy.stageOf(entity);
    dto.releaseDate = entity.releaseDate ?? null;
    dto.releaseReason = entity.releaseReason ?? null;
    return dto;
  }

  static toResponseDtoList(entities: TeamPlayer[]): TeamPlayerResponseDto[] {
    return entities.map((e) => TeamPlayerMapper.toResponseDto(e));
  }
}
