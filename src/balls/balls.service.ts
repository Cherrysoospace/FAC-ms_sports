import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ball } from './entities/ball.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import { BallsRepository } from './repositories/balls.repository';
import { BallMapper } from './mappers/ball.mapper';
import { CreateBallDto } from './dto/create-ball.dto';
import { UpdateBallDto } from './dto/update-ball.dto';
import { BallQueryDto } from './dto/ball-query.dto';
import { BallResponseDto } from './dto/ball-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

// Estados en los que el partido ya no usa la pelota.
const CLOSED_MATCH_STATUSES: MatchStatus[] = [
  MatchStatus.FINISHED,
  MatchStatus.CANCELLED,
];

@Injectable()
export class BallsService {
  constructor(
    @InjectRepository(Ball)
    private readonly ballRepository: Repository<Ball>,
    private readonly ballsRepository: BallsRepository,
  ) {}

  async findAll(query: BallQueryDto): Promise<BallResponseDto[]> {
    const balls = await this.ballsRepository.findByFilters(query);
    return BallMapper.toResponseDtoList(balls);
  }

  async findOne(id: number): Promise<BallResponseDto> {
    const ball = await this.getBallOrFail(id);
    return BallMapper.toResponseDto(ball);
  }

  async create(dto: CreateBallDto): Promise<BallResponseDto> {
    const saved = await this.ballRepository.save(BallMapper.toEntity(dto));
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateBallDto): Promise<BallResponseDto> {
    const ball = await this.getBallOrFail(id);

    if (
      dto.active === false &&
      ball.match &&
      !CLOSED_MATCH_STATUSES.includes(ball.match.status)
    ) {
      throw new BusinessRuleException(
        `No se puede desactivar: la pelota está asignada al partido ` +
          `#${ball.match.id}, que aún no ha finalizado`,
      );
    }

    await this.ballRepository.save(BallMapper.mergeEntity(ball, dto));
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const ball = await this.getBallOrFail(id);

    if (ball.match) {
      throw new BusinessRuleException(
        `No se puede eliminar porque está asignada al partido ` +
          `#${ball.match.id}. Desactívela con PATCH { "active": false }`,
      );
    }

    await this.ballRepository.remove(ball);
    return { message: `Pelota #${id} eliminada correctamente` };
  }

  /**
   * Lo usa Partido: la pelota debe existir (404), estar activa y no estar
   * asignada a otro partido (Partido 1 — 1 Pelota). `matchId` = el partido que
   * se está editando, que puede conservar su propia pelota.
   */
  async getAvailableBallOrFail(id: number, matchId?: number): Promise<Ball> {
    const ball = await this.getBallOrFail(id);
    const label = `${ball.brand} ${ball.model}`;
    if (!ball.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La pelota ${label} está inactiva`,
      );
    }
    if (ball.match && ball.match.id !== matchId) {
      throw new BusinessRuleException(
        `La pelota ${label} ya está asignada al partido #${ball.match.id}`,
      );
    }
    return ball;
  }

  private async getBallOrFail(id: number): Promise<Ball> {
    const ball = await this.ballRepository.findOne({
      where: { id },
      relations: { match: true },
    });
    if (!ball) throw ResourceNotFoundException.of('Pelota', id);
    return ball;
  }
}
