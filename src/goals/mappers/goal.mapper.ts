import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { Match } from '../../matches/entities/match.entity';
import { Player } from '../../players/entities/player.entity';
import { Goal } from '../entities/goal.entity';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import {
  GoalMatchSummaryDto,
  GoalPlayerSummaryDto,
  GoalResponseDto,
  GoalTeamRefDto,
} from '../dto/goal-response.dto';

@Injectable()
export class GoalMapper extends BaseMapper<Goal, GoalResponseDto> {
  toDto(entity: Goal): GoalResponseDto {
    const dto = new GoalResponseDto();
    dto.id = entity.id;
    dto.minute = entity.minute;
    dto.points = entity.points;
    dto.description = entity.description ?? null;
    dto.recordedAt = entity.recordedAt;
    dto.match = this.toMatchSummaryDto(entity.match);
    dto.player = this.toPlayerSummaryDto(entity.player);
    return dto;
  }

  toEntity(match: Match, player: Player, dto: CreateGoalDto): Goal {
    const entity = new Goal();
    entity.match = match;
    entity.player = player;
    entity.minute = dto.minute;
    entity.points = dto.points ?? 1;
    entity.description = dto.description ? dto.description : null;
    return entity;
  }

  mergeEntity(goal: Goal, dto: UpdateGoalDto, player?: Player): Goal {
    if (player !== undefined) goal.player = player;
    if (dto.minute !== undefined) goal.minute = dto.minute;
    if (dto.points !== undefined) goal.points = dto.points;
    if (dto.description !== undefined) {
      goal.description = dto.description ? dto.description : null;
    }
    return goal;
  }

  private toMatchSummaryDto(match: Match): GoalMatchSummaryDto {
    const dto = new GoalMatchSummaryDto();
    dto.id = match.id;
    dto.scheduledAt = match.scheduledAt;
    dto.status = match.status;
    dto.homeTeam = this.toTeamRefDto(match.homeTeam);
    dto.awayTeam = this.toTeamRefDto(match.awayTeam);
    return dto;
  }

  private toTeamRefDto(team: { id: number; name: string }): GoalTeamRefDto {
    const dto = new GoalTeamRefDto();
    dto.id = team.id;
    dto.name = team.name;
    return dto;
  }

  private toPlayerSummaryDto(player: Player): GoalPlayerSummaryDto {
    const dto = new GoalPlayerSummaryDto();
    dto.id = player.id;
    dto.fullName = player.fullName;
    dto.documentNumber = player.documentNumber;
    dto.position = player.position;
    return dto;
  }
}
