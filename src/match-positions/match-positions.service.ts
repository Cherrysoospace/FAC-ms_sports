import { Injectable } from '@nestjs/common';
import { MatchPosition } from './entities/match-position.entity';
import { MatchPositionsRepository } from './repositories/match-positions.repository';
import { BoardMapper } from './mappers/board.mapper';
import {
  PositionItemDto,
  RecordPositionsDto,
} from './dto/record-positions.dto';
import {
  BoardResponseDto,
  RecordPositionsResultDto,
} from './dto/board-response.dto';
import { Match } from '../matches/entities/match.entity';
import { MatchStatus } from '../matches/enums/match-status.enum';
import { MatchesService } from '../matches/matches.service';
import { Player } from '../players/entities/player.entity';
import { TeamPlayersService } from '../team-players/team-players.service';
import { TeamPlayerResponseDto } from '../team-players/dto/team-player-response.dto';
import { ContractStage } from '../team-players/enums/contract-stage.enum';
import { ApplicationException, ErrorCase } from '../common/exceptions';

// HU-GC-09: seguimiento espacial de jugadores y pelota en un partido.
@Injectable()
export class MatchPositionsService {
  constructor(
    private readonly positionsRepository: MatchPositionsRepository,
    private readonly matchesService: MatchesService,
    private readonly teamPlayersService: TeamPlayersService,
  ) {}

  /**
   * Registra una "foto" del campo. Solo con el partido en curso; cada jugador
   * debe pertenecer a la plantilla vigente de uno de los dos equipos y la
   * pelota es siempre la del partido.
   */
  async record(dto: RecordPositionsDto): Promise<RecordPositionsResultDto> {
    const match = await this.matchesService.getMatchOrFail(dto.matchId);
    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El seguimiento solo se registra mientras el partido está en curso',
      );
    }

    const participants = new Set(
      (await this.rosterOf(match)).map((contract) => contract.player.id),
    );
    const recordedAt = new Date();
    const seen = new Set<string>();

    const positions = dto.positions.map((item) => {
      const key = this.subjectKey(item);
      if (seen.has(key)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La ${key === 'ball' ? 'pelota' : `posición del jugador #${item.playerId}`} viene repetida en el mismo envío`,
        );
      }
      seen.add(key);
      if (item.playerId !== undefined && !participants.has(item.playerId)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El jugador #${item.playerId} no participa en el partido (no está en la plantilla vigente de ${match.homeTeam.name} ni de ${match.awayTeam.name})`,
        );
      }
      return this.toEntity(match, item, recordedAt);
    });

    await this.positionsRepository.saveSnapshot(positions);
    return { matchId: match.id, recorded: positions.length, recordedAt };
  }

  // Estado actual de la pizarra: participantes, pelota y su última posición.
  async board(matchId: number): Promise<BoardResponseDto> {
    const match = await this.matchesService.getMatchOrFail(matchId);
    const [roster, latest] = await Promise.all([
      this.rosterOf(match),
      this.positionsRepository.findLatestByMatch(match.id),
    ]);
    return BoardMapper.toResponseDto(match, roster, latest);
  }

  // Jugadores que participan: contratos vigentes de los dos equipos.
  private async rosterOf(match: Match): Promise<TeamPlayerResponseDto[]> {
    const [home, away] = await Promise.all(
      [match.homeTeam.id, match.awayTeam.id].map((teamId) =>
        this.teamPlayersService.findAll({
          teamId,
          stage: ContractStage.CURRENT,
        }),
      ),
    );
    return [...home, ...away];
  }

  // Cada posición es de un jugador o de la pelota, nunca de ambos ni de ninguno.
  private subjectKey(item: PositionItemDto): string {
    const isBall = item.ball === true;
    if (isBall === (item.playerId !== undefined)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Cada posición debe indicar un jugador (playerId) o la pelota (ball: true), no ambos',
      );
    }
    return isBall ? 'ball' : `player-${item.playerId}`;
  }

  private toEntity(
    match: Match,
    item: PositionItemDto,
    recordedAt: Date,
  ): MatchPosition {
    const entity = new MatchPosition();
    entity.match = match;
    entity.player =
      item.playerId !== undefined ? ({ id: item.playerId } as Player) : null;
    entity.ball = item.ball ? match.ball : null;
    entity.x = item.x;
    entity.y = item.y;
    entity.recordedAt = recordedAt;
    return entity;
  }
}
