import { Injectable } from '@nestjs/common';
import { TeamRelationsRepository } from './repositories/team-relations.repository';
import { RelatedTeamMapper } from './mappers/related-team.mapper';
import { CreateTeamRelationDto } from './dto/create-team-relation.dto';
import { RelatedTeamResponseDto } from './dto/related-team-response.dto';
import { TeamsService } from '../teams/teams.service';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

// Equipo n — n Equipo: autorrelación del diagrama de clases.
@Injectable()
export class TeamRelationsService {
  constructor(
    private readonly teamRelationsRepository: TeamRelationsRepository,
    private readonly teamsService: TeamsService,
  ) {}

  async findRelated(teamId: number): Promise<RelatedTeamResponseDto[]> {
    await this.teamsService.getTeamOrFail(teamId);
    const related = await this.teamRelationsRepository.findRelatedTeams(teamId);
    return RelatedTeamMapper.toResponseDtoList(related);
  }

  async relate(
    teamId: number,
    dto: CreateTeamRelationDto,
  ): Promise<{ message: string; relatedTeams: RelatedTeamResponseDto[] }> {
    if (teamId === dto.relatedTeamId) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Un equipo no puede relacionarse consigo mismo',
      );
    }
    const team = await this.teamsService.getActiveTeamOrFail(teamId);
    const related = await this.teamsService.getActiveTeamOrFail(
      dto.relatedTeamId,
    );

    if (await this.teamRelationsRepository.areRelated(team.id, related.id)) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `${team.name} y ${related.name} ya están relacionados`,
      );
    }

    await this.teamRelationsRepository.relate(team.id, related.id);
    return {
      message: `${team.name} y ${related.name} quedaron relacionados`,
      relatedTeams: await this.findRelated(team.id),
    };
  }

  // Retira solo la relación: no borra ninguno de los dos equipos.
  async unrelate(
    teamId: number,
    relatedTeamId: number,
  ): Promise<{ message: string }> {
    const team = await this.teamsService.getTeamOrFail(teamId);
    const related = await this.teamsService.getTeamOrFail(relatedTeamId);

    if (!(await this.teamRelationsRepository.areRelated(team.id, related.id))) {
      throw new ResourceNotFoundException(
        `${team.name} y ${related.name} no están relacionados`,
      );
    }

    await this.teamRelationsRepository.unrelate(team.id, related.id);
    return {
      message: `Se retiró la relación entre ${team.name} y ${related.name}`,
    };
  }
}
