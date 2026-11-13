import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from '../entities/sport.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';
import { SportQueryDto } from '../dto/sport-query.dto';

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

  // Ids de los ancestros de `id` (padre, abuelo, ... hasta la raíz).
  // Se corta si encuentra un id repetido, por si ya hubiera un ciclo en datos.
  async findAncestorIds(id: number): Promise<number[]> {
    const ancestors: number[] = [];
    const visited = new Set<number>([id]);
    let currentId: number | null = id;

    while (currentId !== null) {
      const row: { parentId: number | null } | undefined =
        await this.sportRepository
          .createQueryBuilder('sport')
          .select('sport.parent_id', 'parentId')
          .where('sport.id = :id', { id: currentId })
          .getRawOne();

      const parentId: number | null = row?.parentId != null ? Number(row.parentId) : null;
      if (parentId === null || visited.has(parentId)) break;

      ancestors.push(parentId);
      visited.add(parentId);
      currentId = parentId;
    }

    return ancestors;
  }
}
