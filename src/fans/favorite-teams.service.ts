import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FanTeam } from './entities/fan-team.entity';
import { FanTeamsRepository } from './repositories/fan-teams.repository';
import { FavoriteTeamMapper } from './mappers/favorite-team.mapper';
import { AddFavoriteTeamDto } from './dto/add-favorite-team.dto';
import { FavoriteTeamResponseDto } from './dto/favorite-team-response.dto';
import { FansService } from './fans.service';
import { TeamsService } from '../teams/teams.service';
import type { AuthenticatedUser } from '../security/authenticated-user';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class FavoriteTeamsService {
  constructor(
    @InjectRepository(FanTeam)
    private readonly fanTeamRepository: Repository<FanTeam>,
    private readonly fanTeamsRepository: FanTeamsRepository,
    private readonly favoriteTeamMapper: FavoriteTeamMapper,
    private readonly fansService: FansService,
    private readonly teamsService: TeamsService,
  ) {}

  async findBySecurityUser(
    user: AuthenticatedUser,
  ): Promise<FavoriteTeamResponseDto[]> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const favorites = await this.fanTeamsRepository.findByFanId(fan.id);
    return this.favoriteTeamMapper.toDtoList(favorites);
  }

  async addFavorite(
    user: AuthenticatedUser,
    dto: AddFavoriteTeamDto,
  ): Promise<FavoriteTeamResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const team = await this.teamsService.getActiveTeamOrFail(dto.teamId);

    const exists = await this.fanTeamsRepository.existsByFanAndTeam(
      fan.id,
      team.id,
    );
    if (exists) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El equipo ${team.name} ya está en tus favoritos`,
      );
    }

    const entity = new FanTeam();
    entity.fan = fan;
    entity.team = team;
    await this.fanTeamRepository.save(entity);

    const hydrated = await this.fanTeamsRepository.findOneByFanAndTeam(
      fan.id,
      team.id,
    );
    return this.favoriteTeamMapper.toDto(hydrated ?? entity);
  }

  async removeFavorite(
    user: AuthenticatedUser,
    teamId: number,
  ): Promise<{ message: string }> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const favorite = await this.fanTeamsRepository.findOneByFanAndTeam(
      fan.id,
      teamId,
    );
    if (!favorite) {
      throw new ResourceNotFoundException(
        `El equipo #${teamId} no está en tus favoritos`,
      );
    }

    // Solo elimina la preferencia; aficionado y equipo permanecen intactos.
    await this.fanTeamRepository.remove(favorite);
    return {
      message: `${favorite.team.name} fue retirado de tus equipos favoritos`,
    };
  }
}

