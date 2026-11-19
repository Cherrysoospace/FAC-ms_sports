import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { SkillQueryDto } from '../dto/skill-query.dto';
import { escapeLike } from '../../common/database/query.util';

// Consultas propias del módulo de habilidades.
@Injectable()
export class SkillsRepository {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  findByFilters(query: SkillQueryDto): Promise<Skill[]> {
    const qb = this.skillRepository
      .createQueryBuilder('skill')
      .orderBy('skill.name', 'ASC');

    if (query.search) {
      qb.andWhere('LOWER(skill.name) LIKE LOWER(:search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.category !== undefined) {
      qb.andWhere('skill.category = :category', { category: query.category });
    }

    return qb.getMany();
  }

  findByNameIgnoringCase(
    name: string,
    excludeId?: number,
  ): Promise<Skill | null> {
    const qb = this.skillRepository
      .createQueryBuilder('skill')
      .where('LOWER(skill.name) = LOWER(:name)', { name });

    if (excludeId !== undefined) {
      qb.andWhere('skill.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }
}
