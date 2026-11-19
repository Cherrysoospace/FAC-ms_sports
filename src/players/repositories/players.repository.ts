import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../entities/player.entity';
import { PlayerQueryDto } from '../dto/player-query.dto';
import { escapeLike } from '../../common/database/query.util';

// Consultas propias del módulo de jugadores.
@Injectable()
export class PlayersRepository {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
  ) {}

  findByFilters(query: PlayerQueryDto): Promise<Player[]> {
    const qb = this.playerRepository
      .createQueryBuilder('player')
      .orderBy('player.fullName', 'ASC');

    if (query.search) {
      // El documento se guarda sin puntos: '1.053' también encuentra '1053...'.
      qb.andWhere(
        '(LOWER(player.fullName) LIKE LOWER(:search) OR player.documentNumber LIKE :document)',
        {
          search: `%${escapeLike(query.search)}%`,
          document: `%${escapeLike(query.search.replace(/[.\s]/g, '').toUpperCase())}%`,
        },
      );
    }
    if (query.active !== undefined) {
      qb.andWhere('player.active = :active', { active: query.active });
    }

    return qb.getMany();
  }

  findByDocumentNumber(
    documentNumber: string,
    excludeId?: number,
  ): Promise<Player | null> {
    const qb = this.playerRepository
      .createQueryBuilder('player')
      .where('player.documentNumber = :documentNumber', { documentNumber });

    if (excludeId !== undefined) {
      qb.andWhere('player.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }
}
