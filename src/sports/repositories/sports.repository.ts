import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from '../entities/sport.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';
import { SportQueryDto } from '../dto/sport-query.dto';
import { findAncestorIdsMany } from '../../common/database/hierarchy.util';

// Consultas propias del módulo de deportes.
@Injectable()
export class SportsRepository {
  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TeamSport)
    private readonly teamSportRepository: Repository<TeamSport>,
  ) {}

  findByFilters(query: SportQueryDto): Promise<Sport[]> {
    const qb = this.sportRepository
      .createQueryBuilder('sport')
      .leftJoinAndSelect('sport.parent', 'parent')
      .orderBy('sport.name', 'ASC');

    if (query.parentId !== undefined) {
      qb.andWhere('parent.id = :parentId', { parentId: query.parentId });
    }
    if (query.roots === true) {
      qb.andWhere('sport.parent IS NULL');
    }
    if (query.active !== undefined) {
      qb.andWhere('sport.active = :active', { active: query.active });
    }

    return qb.getMany();
  }

  findByNameIgnoringCase(
    name: string,
    excludeId?: number,
  ): Promise<Sport | null> {
    const qb = this.sportRepository
      .createQueryBuilder('sport')
      .where('LOWER(sport.name) = LOWER(:name)', { name });

    if (excludeId !== undefined) {
      qb.andWhere('sport.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  countSubSports(id: number): Promise<number> {
    return this.sportRepository.count({ where: { parent: { id } } });
  }

  countTournaments(id: number): Promise<number> {
    return this.tournamentRepository.count({ where: { sport: { id } } });
  }

  countTeamSports(id: number): Promise<number> {
    return this.teamSportRepository.count({ where: { sport: { id } } });
  }

  // Ids de los ancestros de `id` (padre, abuelo, ... hasta la raíz), en una
  // sola consulta. Se corta si encuentra un id repetido (ciclo en datos).
  async findAncestorIds(id: number): Promise<number[]> {
    return (await this.findAncestorIdsMany([id])).get(id) ?? [];
  }

  // Lo mismo para varios ids a la vez, también en una sola consulta.
  findAncestorIdsMany(ids: readonly number[]): Promise<Map<number, number[]>> {
    return findAncestorIdsMany(this.sportRepository, ids);
  }
}
