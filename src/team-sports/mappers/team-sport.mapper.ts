import { TeamSport } from '../entities/team-sport.entity';
import { Team } from '../../teams/entities/team.entity';
import { Sport } from '../../sports/entities/sport.entity';
import {
  TeamSportResponseDto,
  TeamSportSportDto,
  TeamSportTeamDto,
} from '../dto/team-sport-response.dto';

export class TeamSportMapper {
  static toEntity(team: Team, sport: Sport): TeamSport {
    const entity = new TeamSport();
    entity.team = team;
    entity.sport = sport;
    return entity;
  }

  // Requiere las relaciones team y sport cargadas.
  static toResponseDto(entity: TeamSport): TeamSportResponseDto {
    const team = new TeamSportTeamDto();
    team.id = entity.team.id;
    team.name = entity.team.name;
    team.city = entity.team.city;
    team.modality = entity.team.modality;

    const sport = new TeamSportSportDto();
    sport.id = entity.sport.id;
    sport.name = entity.sport.name;

    const dto = new TeamSportResponseDto();
    dto.id = entity.id;
    dto.team = team;
    dto.sport = sport;
    return dto;
  }

  static toResponseDtoList(entities: TeamSport[]): TeamSportResponseDto[] {
    return entities.map((e) => TeamSportMapper.toResponseDto(e));
  }
}
