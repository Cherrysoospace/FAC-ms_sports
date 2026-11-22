import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupPhase } from '../../phases/entities/group-phase.entity';
import { FinalPhase } from '../../phases/entities/final-phase.entity';
import { Team } from '../../teams/entities/team.entity';
import { Match } from '../../matches/entities/match.entity';
import { Goal } from '../../goals/entities/goal.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';

export interface TournamentDevelopmentData {
  groups: GroupPhase[];
  finals: FinalPhase[];
  // Con group cargado
  teams: Team[];
  // Con phase, homeTeam, awayTeam y venue cargados
  matches: Match[];
  // Con match y player (player.teamPlayers solo con los dos equipos del partido)
  goals: Goal[];
  // Inscripciones ACTIVE del torneo (equipos del resumen)
  activeRegistrationsCount: number;
}

/**
 * Consultas de solo lectura de HU-GC-08b. Siempre el mismo número de
 * consultas (6, en paralelo) sin importar cuántos grupos, partidos o
 * anotaciones tenga el torneo, y todas filtradas por el id del torneo
 * (criterio 10). Sin consultas dentro de bucles.
 */
@Injectable()
export class TournamentDevelopmentRepository {
  constructor(
    @InjectRepository(GroupPhase)
    private readonly groupPhaseRepository: Repository<GroupPhase>,
    @InjectRepository(FinalPhase)
    private readonly finalPhaseRepository: Repository<FinalPhase>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

  async loadByTournament(
    tournamentId: number,
  ): Promise<TournamentDevelopmentData> {
    const [groups, finals, teams, matches, goals, activeRegistrationsCount] =
      await Promise.all([
        this.findGroups(tournamentId),
        this.findFinals(tournamentId),
        this.findGroupTeams(tournamentId),
        this.findMatches(tournamentId),
        this.findGoals(tournamentId),
        this.countActiveRegistrations(tournamentId),
      ]);
    return { groups, finals, teams, matches, goals, activeRegistrationsCount };
  }

  // (f) Equipos inscritos con inscripción ACTIVE (un COUNT, sin cargar filas).
  private countActiveRegistrations(tournamentId: number): Promise<number> {
    return this.registrationRepository
      .createQueryBuilder('registration')
      .where('registration.tournament_id = :tournamentId', { tournamentId })
      .andWhere('registration.status = :status', {
        status: RegistrationStatus.ACTIVE,
      })
      .getCount();
  }

  // (b1) Grupos de la fase de grupos.
  private findGroups(tournamentId: number): Promise<GroupPhase[]> {
    return this.groupPhaseRepository
      .createQueryBuilder('groupPhase')
      .where('groupPhase.tournament_id = :tournamentId', { tournamentId })
      .orderBy('groupPhase.order', 'ASC')
      .addOrderBy('groupPhase.groupName', 'ASC')
      .getMany();
  }

  // (b2) Rondas de la fase final.
  private findFinals(tournamentId: number): Promise<FinalPhase[]> {
    return this.finalPhaseRepository
      .createQueryBuilder('finalPhase')
      .where('finalPhase.tournament_id = :tournamentId', { tournamentId })
      .orderBy('finalPhase.order', 'ASC')
      .addOrderBy('finalPhase.id', 'ASC')
      .getMany();
  }

  // (c) Equipos de los grupos del torneo (Grupo 1 — n Equipo).
  private findGroupTeams(tournamentId: number): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .innerJoinAndSelect('team.group', 'groupPhase')
      .where('groupPhase.tournament_id = :tournamentId', { tournamentId })
      .orderBy('team.name', 'ASC')
      .addOrderBy('team.id', 'ASC')
      .getMany();
  }

  // (d) Partidos de todas las fases del torneo.
  private findMatches(tournamentId: number): Promise<Match[]> {
    return this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.phase', 'phase')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .innerJoinAndSelect('match.venue', 'venue')
      .where('phase.tournament_id = :tournamentId', { tournamentId })
      .orderBy('match.scheduledAt', 'ASC')
      .addOrderBy('match.id', 'ASC')
      .getMany();
  }

  // (e) Anotaciones de los partidos del torneo con el jugador y sus
  // contratos con los dos equipos del partido (para deducir el equipo).
  private findGoals(tournamentId: number): Promise<Goal[]> {
    return this.goalRepository
      .createQueryBuilder('goal')
      .innerJoinAndSelect('goal.match', 'match')
      .innerJoin('match.phase', 'phase')
      .innerJoinAndSelect('goal.player', 'player')
      .leftJoinAndSelect(
        'player.teamPlayers',
        'contract',
        'contract.team_id IN (match.home_team_id, match.away_team_id)',
      )
      .leftJoinAndSelect('contract.team', 'contractTeam')
      .where('phase.tournament_id = :tournamentId', { tournamentId })
      .orderBy('goal.minute', 'ASC')
      .addOrderBy('goal.id', 'ASC')
      .getMany();
  }
}
