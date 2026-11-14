import { Registration } from '../entities/registration.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Team } from '../../teams/entities/team.entity';
import { RegistrationStatus } from '../enums/registration-status.enum';
import {
  RegistrationResponseDto,
  RegistrationTeamDto,
  RegistrationTournamentDto,
} from '../dto/registration-response.dto';

export class RegistrationMapper {
  // registeredAt lo pone la base de datos (CreateDateColumn).
  static toEntity(tournament: Tournament, team: Team): Registration {
    const entity = new Registration();
    entity.tournament = tournament;
    entity.team = team;
    entity.status = RegistrationStatus.ACTIVE;
    return entity;
  }

  static toResponseDto(entity: Registration): RegistrationResponseDto {
    const tournament = new RegistrationTournamentDto();
    tournament.id = entity.tournament.id;
    tournament.name = entity.tournament.name;

    const team = new RegistrationTeamDto();
    team.id = entity.team.id;
    team.name = entity.team.name;
    team.city = entity.team.city;
    team.modality = entity.team.modality;

    const dto = new RegistrationResponseDto();
    dto.id = entity.id;
    dto.tournament = tournament;
    dto.team = team;
    dto.status = entity.status;
    dto.registeredAt = entity.registeredAt;
    dto.withdrawnAt = entity.withdrawnAt ?? null;
    return dto;
  }

  static toResponseDtoList(
    entities: Registration[],
  ): RegistrationResponseDto[] {
    return entities.map((e) => RegistrationMapper.toResponseDto(e));
  }
}
