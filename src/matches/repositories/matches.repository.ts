import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Match } from '../entities/match.entity';
import { Phase } from '../../phases/entities/phase.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';
import { MatchPosition } from '../../match-positions/entities/match-position.entity';
import { Goal } from '../../goals/entities/goal.entity';
import { MatchQueryDto } from '../dto/match-query.dto';

// Consultas propias del módulo de partidos.
@Injectable()
export class MatchesRepository {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(MatchPosition)
    private readonly positionRepository: Repository<MatchPosition>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
  ) {}

  // Partido con todo lo que necesita MatchMapper.
  private withRelations(): SelectQueryBuilder<Match> {
    return this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.phase', 'phase')
      .innerJoinAndSelect('phase.tournament', 'tournament')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .innerJoinAndSelect('match.venue', 'venue')
      .innerJoinAndSelect('match.ball', 'ball');
  }

  findByFilters(query: MatchQueryDto): Promise<Match[]> {
    const qb = this.withRelations()
      .orderBy('match.scheduledAt', 'ASC')
      .addOrderBy('match.id', 'ASC');

    if (query.tournamentId !== undefined) {
      qb.andWhere('tournament.id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    }
    if (query.phaseId !== undefined) {
      qb.andWhere('phase.id = :phaseId', { phaseId: query.phaseId });
    }
    if (query.teamId !== undefined) {
      qb.andWhere('(homeTeam.id = :teamId OR awayTeam.id = :teamId)', {
        teamId: query.teamId,
      });
    }
    if (query.venueId !== undefined) {
      qb.andWhere('venue.id = :venueId', { venueId: query.venueId });
    }
    if (query.status !== undefined) {
      qb.andWhere('match.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  findOneWithRelations(id: number): Promise<Match | null> {
    return this.withRelations().where('match.id = :id', { id }).getOne();
  }

  // Fase (de grupos o final) con su torneo. TypeORM devuelve la subclase.
  findPhase(id: number): Promise<Phase | null> {
    return this.phaseRepository.findOne({
      where: { id },
      relations: { tournament: true },
    });
  }

  // Registros de seguimiento espacial (HU-GC-09): bloquean la eliminación.
  countPositions(matchId: number): Promise<number> {
    return this.positionRepository.count({ where: { match: { id: matchId } } });
  }

  // Anotaciones del partido (HU-GC-07): bloquean la eliminación.
  countGoals(matchId: number): Promise<number> {
    return this.goalRepository.count({ where: { match: { id: matchId } } });
  }

  // "Habilitado para la competencia" = inscripción ACTIVE en el torneo.
  isRegistered(teamId: number, tournamentId: number): Promise<boolean> {
    return this.registrationRepository.exists({
      where: {
        team: { id: teamId },
        tournament: { id: tournamentId },
        status: RegistrationStatus.ACTIVE,
      },
    });
  }
}
