import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Registration } from '../entities/registration.entity';
import { RegistrationStatus } from '../enums/registration-status.enum';
import { GroupPhase } from '../../phases/entities/group-phase.entity';
import { RegistrationQueryDto } from '../dto/registration-query.dto';

// Consultas propias del módulo de inscripciones.
@Injectable()
export class RegistrationsRepository {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(GroupPhase)
    private readonly groupPhaseRepository: Repository<GroupPhase>,
  ) {}

  findByFilters(query: RegistrationQueryDto): Promise<Registration[]> {
    const qb = this.registrationRepository
      .createQueryBuilder('registration')
      .innerJoinAndSelect('registration.tournament', 'tournament')
      .innerJoinAndSelect('registration.team', 'team')
      .orderBy('registration.registeredAt', 'ASC')
      .addOrderBy('registration.id', 'ASC');

    if (query.tournamentId !== undefined) {
      qb.andWhere('tournament.id = :tournamentId', {
        tournamentId: query.tournamentId,
      });
    }
    if (query.teamId !== undefined) {
      qb.andWhere('team.id = :teamId', { teamId: query.teamId });
    }
    if (query.status !== undefined) {
      qb.andWhere('registration.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  // Inscripciones del torneo para esos equipos, con torneo y equipo cargados.
  findByTournamentAndTeams(
    tournamentId: number,
    teamIds: number[],
  ): Promise<Registration[]> {
    return this.registrationRepository.find({
      where: { tournament: { id: tournamentId }, team: { id: In(teamIds) } },
      relations: { tournament: true, team: true },
    });
  }

  existsActive(tournamentId: number, teamId: number): Promise<boolean> {
    return this.registrationRepository.exists({
      where: {
        tournament: { id: tournamentId },
        team: { id: teamId },
        status: RegistrationStatus.ACTIVE,
      },
    });
  }

  // Grupo del torneo en el que está el equipo; null si no está en ninguno.
  findTeamGroupInTournament(
    teamId: number,
    tournamentId: number,
  ): Promise<GroupPhase | null> {
    return this.groupPhaseRepository.findOne({
      where: { tournament: { id: tournamentId }, teams: { id: teamId } },
    });
  }
}
