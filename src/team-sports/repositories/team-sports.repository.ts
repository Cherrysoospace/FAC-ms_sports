import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamSport } from '../entities/team-sport.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';
import { TournamentStatusPolicy } from '../../tournaments/policies/tournament-status.policy';
import { TeamSportQueryDto } from '../dto/team-sport-query.dto';

// Consultas propias del módulo de equipo-deporte.
@Injectable()
export class TeamSportsRepository {
  constructor(
    @InjectRepository(TeamSport)
    private readonly teamSportRepository: Repository<TeamSport>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

  findByFilters(query: TeamSportQueryDto): Promise<TeamSport[]> {
    const qb = this.teamSportRepository
      .createQueryBuilder('teamSport')
      .innerJoinAndSelect('teamSport.team', 'team')
      .innerJoinAndSelect('teamSport.sport', 'sport')
      .orderBy('sport.name', 'ASC')
      .addOrderBy('team.name', 'ASC');

    if (query.teamId !== undefined) {
      qb.andWhere('team.id = :teamId', { teamId: query.teamId });
    }
    if (query.sportId !== undefined) {
      qb.andWhere('sport.id = :sportId', { sportId: query.sportId });
    }

    return qb.getMany();
  }

  existsAssociation(teamId: number, sportId: number): Promise<boolean> {
    return this.teamSportRepository.exists({
      where: { team: { id: teamId }, sport: { id: sportId } },
    });
  }

  // Inscripción ACTIVE del equipo en un torneo de ese deporte que siga en juego.
  findOpenRegistrationForSport(
    teamId: number,
    sportId: number,
  ): Promise<Registration | null> {
    return this.registrationRepository
      .createQueryBuilder('registration')
      .innerJoinAndSelect('registration.tournament', 'tournament')
      .where('registration.team_id = :teamId', { teamId })
      .andWhere('registration.status = :status', {
        status: RegistrationStatus.ACTIVE,
      })
      .andWhere('tournament.sport_id = :sportId', { sportId })
      .andWhere('tournament.status NOT IN (:...closed)', {
        closed: [...TournamentStatusPolicy.CLOSED],
      })
      .orderBy('tournament.startDate', 'ASC')
      .getOne();
  }
}
