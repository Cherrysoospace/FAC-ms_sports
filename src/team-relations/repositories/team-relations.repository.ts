import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';

/**
 * Tabla pura team_relations (Equipo n — n Equipo). La relación es simétrica:
 * se guarda en ambos sentidos (A→B y B→A) dentro de una transacción, así
 * los equipos relacionados se consultan siempre desde team_id.
 */
@Injectable()
export class TeamRelationsRepository {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  findRelatedTeams(teamId: number): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .innerJoin('team.relatedTeams', 'owner')
      .where('owner.id = :teamId', { teamId })
      .orderBy('team.name', 'ASC')
      .getMany();
  }

  async areRelated(teamId: number, relatedTeamId: number): Promise<boolean> {
    const count = await this.teamRepository
      .createQueryBuilder('team')
      .innerJoin('team.relatedTeams', 'related')
      .where('team.id = :teamId', { teamId })
      .andWhere('related.id = :relatedTeamId', { relatedTeamId })
      .getCount();
    return count > 0;
  }

  relate(teamId: number, relatedTeamId: number): Promise<void> {
    return this.teamRepository.manager.transaction(async (manager) => {
      const relation = () =>
        manager.createQueryBuilder().relation(Team, 'relatedTeams');
      await relation().of(teamId).add(relatedTeamId);
      await relation().of(relatedTeamId).add(teamId);
    });
  }

  unrelate(teamId: number, relatedTeamId: number): Promise<void> {
    return this.teamRepository.manager.transaction(async (manager) => {
      const relation = () =>
        manager.createQueryBuilder().relation(Team, 'relatedTeams');
      await relation().of(teamId).remove(relatedTeamId);
      await relation().of(relatedTeamId).remove(teamId);
    });
  }
}
