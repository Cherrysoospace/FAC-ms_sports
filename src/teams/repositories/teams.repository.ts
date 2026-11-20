import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamModality } from '../enums/team-modality.enum';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';
import { Match } from '../../matches/entities/match.entity';
import { TeamPlayer } from '../../team-players/entities/team-player.entity';
import { ContractStage } from '../../team-players/enums/contract-stage.enum';
import { contractStageCondition } from '../../team-players/repositories/contract-stage.sql';
import { TournamentStatusPolicy } from '../../tournaments/policies/tournament-status.policy';
import { TeamQueryDto } from '../dto/team-query.dto';
import { TeamSportSummaryDto } from '../dto/team-response.dto';
import {
  CountRow,
  escapeLike,
  toCountMap,
} from '../../common/database/query.util';

interface SportRow {
  teamId: number | string;
  sportId: number | string;
  sportName: string;
}

// Consultas propias del módulo de equipos.
@Injectable()
export class TeamsRepository {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamSport)
    private readonly teamSportRepository: Repository<TeamSport>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(TeamPlayer)
    private readonly teamPlayerRepository: Repository<TeamPlayer>,
  ) {}

  findByFilters(query: TeamQueryDto): Promise<Team[]> {
    // "group" es palabra reservada en SQL: el alias es teamGroup.
    const qb = this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.group', 'teamGroup')
      .leftJoinAndSelect('teamGroup.tournament', 'groupTournament')
      .orderBy('team.name', 'ASC')
      .addOrderBy('team.modality', 'ASC');

    if (query.search) {
      qb.andWhere('LOWER(team.name) LIKE LOWER(:search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.modality !== undefined) {
      qb.andWhere('team.modality = :modality', { modality: query.modality });
    }
    if (query.active !== undefined) {
      qb.andWhere('team.active = :active', { active: query.active });
    }
    if (query.sportId !== undefined) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM team_sports ts WHERE ts.team_id = team.id AND ts.sport_id = :sportId)',
        { sportId: query.sportId },
      );
    }

    return qb.getMany();
  }

  findByNameAndModality(
    name: string,
    modality: TeamModality,
    excludeId?: number,
  ): Promise<Team | null> {
    const qb = this.teamRepository
      .createQueryBuilder('team')
      .where('LOWER(team.name) = LOWER(:name)', { name })
      .andWhere('team.modality = :modality', { modality });

    if (excludeId !== undefined) {
      qb.andWhere('team.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  // Deportes de varios equipos en una sola consulta.
  async sportsByTeamIds(
    ids: number[],
  ): Promise<Map<number, TeamSportSummaryDto[]>> {
    const sports = new Map<number, TeamSportSummaryDto[]>();
    if (ids.length === 0) return sports;

    const rows = await this.teamSportRepository
      .createQueryBuilder('teamSport')
      .innerJoin('teamSport.sport', 'sport')
      .select('teamSport.team_id', 'teamId')
      .addSelect('sport.id', 'sportId')
      .addSelect('sport.name', 'sportName')
      .where('teamSport.team_id IN (:...ids)', { ids })
      .orderBy('sport.name', 'ASC')
      .getRawMany<SportRow>();

    for (const row of rows) {
      const teamId = Number(row.teamId);
      const list = sports.get(teamId) ?? [];
      list.push({ id: Number(row.sportId), name: row.sportName });
      sports.set(teamId, list);
    }
    return sports;
  }

  // Inscripciones ACTIVE por equipo en una sola consulta.
  async countActiveRegistrationsByTeamIds(
    ids: number[],
  ): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.registrationRepository
      .createQueryBuilder('registration')
      .select('registration.team_id', 'id')
      .addSelect('COUNT(*)', 'total')
      .where('registration.team_id IN (:...ids)', { ids })
      .andWhere('registration.status = :status', {
        status: RegistrationStatus.ACTIVE,
      })
      .groupBy('registration.team_id')
      .getRawMany<CountRow>();
    return toCountMap(rows);
  }

  countActiveRegistrations(teamId: number): Promise<number> {
    return this.registrationRepository.count({
      where: { team: { id: teamId }, status: RegistrationStatus.ACTIVE },
    });
  }

  // Inscripciones ACTIVE en torneos que no están cerrados (TournamentStatusPolicy.CLOSED).
  findOpenActiveRegistrations(teamId: number): Promise<Registration[]> {
    return this.registrationRepository
      .createQueryBuilder('registration')
      .innerJoinAndSelect('registration.tournament', 'tournament')
      .where('registration.team_id = :teamId', { teamId })
      .andWhere('registration.status = :status', {
        status: RegistrationStatus.ACTIVE,
      })
      .andWhere('tournament.status NOT IN (:...closed)', {
        closed: [...TournamentStatusPolicy.CLOSED],
      })
      .orderBy('tournament.name', 'ASC')
      .getMany();
  }

  countTeamSports(teamId: number): Promise<number> {
    return this.teamSportRepository.count({ where: { team: { id: teamId } } });
  }

  // Todas las inscripciones (también las retiradas): bloquean la eliminación.
  countRegistrations(teamId: number): Promise<number> {
    return this.registrationRepository.count({
      where: { team: { id: teamId } },
    });
  }

  // Partidos como local o visitante.
  countMatches(teamId: number): Promise<number> {
    return this.matchRepository.count({
      where: [{ homeTeam: { id: teamId } }, { awayTeam: { id: teamId } }],
    });
  }

  // Jugadores con contrato vigente hoy, por equipo, en una sola consulta.
  async countCurrentPlayersByTeamIds(
    ids: number[],
  ): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const current = contractStageCondition('teamPlayer', ContractStage.CURRENT);
    const rows = await this.teamPlayerRepository
      .createQueryBuilder('teamPlayer')
      .select('teamPlayer.team_id', 'id')
      .addSelect('COUNT(*)', 'total')
      .where('teamPlayer.team_id IN (:...ids)', { ids })
      .andWhere(current.sql, current.params)
      .groupBy('teamPlayer.team_id')
      .getRawMany<CountRow>();
    return toCountMap(rows);
  }

  // Todos los contratos (también el historial de traspasos).
  countTeamPlayers(teamId: number): Promise<number> {
    return this.teamPlayerRepository.count({
      where: { team: { id: teamId } },
    });
  }

  // Equipos relacionados (autorrelación team_relations).
  countRelatedTeams(teamId: number): Promise<number> {
    return this.teamRepository
      .createQueryBuilder('team')
      .innerJoin('team.relatedTeams', 'related')
      .where('team.id = :teamId', { teamId })
      .getCount();
  }
}
