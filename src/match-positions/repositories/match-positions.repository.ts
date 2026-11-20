import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchPosition } from '../entities/match-position.entity';

// Consultas propias de las posiciones espaciales.
@Injectable()
export class MatchPositionsRepository {
  constructor(
    @InjectRepository(MatchPosition)
    private readonly positionRepository: Repository<MatchPosition>,
  ) {}

  // Guarda la "foto" completa en una transacción: o todas o ninguna.
  async saveSnapshot(positions: MatchPosition[]): Promise<void> {
    await this.positionRepository.manager.transaction((manager) =>
      manager.save(positions),
    );
  }

  /**
   * Último registro de cada jugador y de la pelota en el partido (lo que se
   * dibuja en la pizarra). Los ids crecen con el tiempo: el mayor es el último.
   */
  findLatestByMatch(matchId: number): Promise<MatchPosition[]> {
    return this.positionRepository
      .createQueryBuilder('position')
      .leftJoinAndSelect('position.player', 'player')
      .leftJoinAndSelect('position.ball', 'ball')
      .where(
        'position.id IN (SELECT MAX(latest.id) FROM match_positions latest ' +
          'WHERE latest.match_id = :matchId GROUP BY latest.player_id, latest.ball_id)',
        { matchId },
      )
      .getMany();
  }

  // Lo usa Partido para no borrar un partido con seguimiento registrado.
  countByMatch(matchId: number): Promise<number> {
    return this.positionRepository.count({
      where: { match: { id: matchId } },
    });
  }
}
