import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamSport } from './entities/team-sport.entity';
import { Sport } from '../sports/entities/sport.entity';
import { TeamsService } from '../teams/teams.service';
import { TeamSportsRepository } from './repositories/team-sports.repository';
import { TeamSportMapper } from './mappers/team-sport.mapper';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportQueryDto } from './dto/team-sport-query.dto';
import { TeamSportResponseDto } from './dto/team-sport-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class TeamSportsService {
  constructor(
    @InjectRepository(TeamSport)
    private readonly teamSportRepository: Repository<TeamSport>,
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
    private readonly teamSportsRepository: TeamSportsRepository,
    private readonly teamsService: TeamsService,
  ) {}

  // ?teamId → deportes del equipo; ?sportId → equipos del deporte.
  async findAll(query: TeamSportQueryDto): Promise<TeamSportResponseDto[]> {
    const associations = await this.teamSportsRepository.findByFilters(query);
    return TeamSportMapper.toResponseDtoList(associations);
  }

  async findOne(id: number): Promise<TeamSportResponseDto> {
    const association = await this.getTeamSportOrFail(id);
    return TeamSportMapper.toResponseDto(association);
  }

  async create(dto: CreateTeamSportDto): Promise<TeamSportResponseDto> {
    const team = await this.teamsService.getTeamOrFail(dto.teamId);
    if (!team.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo ${team.name} está inactivo`,
      );
    }

    const sport = await this.sportRepository.findOne({
      where: { id: dto.sportId },
    });
    if (!sport) throw ResourceNotFoundException.of('Deporte', dto.sportId);
    if (!sport.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El deporte ${sport.name} está inactivo`,
      );
    }

    if (await this.teamSportsRepository.existsAssociation(team.id, sport.id)) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El equipo ${team.name} ya está asociado a ${sport.name}`,
      );
    }

    const saved = await this.teamSportRepository.save(
      TeamSportMapper.toEntity(team, sport),
    );
    return this.findOne(saved.id);
  }

  // Retira solo la asociación: no borra el equipo ni el deporte.
  async remove(id: number): Promise<{ message: string }> {
    const association = await this.getTeamSportOrFail(id);
    const { team, sport } = association;

    const open = await this.teamSportsRepository.findOpenRegistrationForSport(
      team.id,
      sport.id,
    );
    if (open) {
      throw new BusinessRuleException(
        `No se puede retirar: ${team.name} está inscrito en el torneo ` +
          open.tournament.name,
      );
    }

    await this.teamSportRepository.remove(association);
    return { message: `Se retiró ${sport.name} de los deportes de ${team.name}` };
  }

  private async getTeamSportOrFail(id: number): Promise<TeamSport> {
    const association = await this.teamSportRepository.findOne({
      where: { id },
      relations: { team: true, sport: true },
    });
    if (!association) {
      throw ResourceNotFoundException.of('Asociación equipo-deporte', id);
    }
    return association;
  }
}
