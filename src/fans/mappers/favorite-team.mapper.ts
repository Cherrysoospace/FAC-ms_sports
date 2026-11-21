import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { FanTeam } from '../entities/fan-team.entity';
import {
  FavoriteTeamResponseDto,
  FavoriteTeamSummaryDto,
} from '../dto/favorite-team-response.dto';

@Injectable()
export class FavoriteTeamMapper extends BaseMapper<
  FanTeam,
  FavoriteTeamResponseDto
> {
  toDto(entity: FanTeam): FavoriteTeamResponseDto {
    const teamDto = new FavoriteTeamSummaryDto();
    teamDto.id = entity.team.id;
    teamDto.name = entity.team.name;
    teamDto.city = entity.team.city;
    teamDto.modality = entity.team.modality;
    teamDto.active = entity.team.active;

    const dto = new FavoriteTeamResponseDto();
    dto.id = entity.id;
    dto.createdAt = entity.createdAt;
    dto.team = teamDto;
    return dto;
  }
}

