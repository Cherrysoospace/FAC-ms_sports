import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ball } from '../entities/ball.entity';
import { Match } from '../../matches/entities/match.entity';
import { BallQueryDto } from '../dto/ball-query.dto';

// Consultas propias del módulo de pelotas.
@Injectable()
export class BallsRepository {
  constructor(
    @InjectRepository(Ball)
    private readonly ballRepository: Repository<Ball>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  findByFilters(query: BallQueryDto): Promise<Ball[]> {
    const qb = this.ballRepository
      .createQueryBuilder('ball')
      .leftJoinAndSelect('ball.match', 'match')
      .orderBy('ball.brand', 'ASC')
      .addOrderBy('ball.model', 'ASC');

    if (query.active !== undefined) {
      qb.andWhere('ball.active = :active', { active: query.active });
    }
    if (query.available === true) {
      qb.andWhere('ball.active = :availableActive', { availableActive: true });
      qb.andWhere('match.id IS NULL');
    }

    return qb.getMany();
  }

  async isAssignedToMatch(id: number): Promise<boolean> {
    return this.matchRepository.exists({ where: { ball: { id } } });
  }
}
