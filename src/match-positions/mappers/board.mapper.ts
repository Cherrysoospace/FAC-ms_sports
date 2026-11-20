import { Match } from '../../matches/entities/match.entity';
import { MatchPosition } from '../entities/match-position.entity';
import { TeamPlayerResponseDto } from '../../team-players/dto/team-player-response.dto';
import {
  BoardPlayerDto,
  BoardPointDto,
  BoardResponseDto,
  BoardTeamDto,
} from '../dto/board-response.dto';

const toPoint = (position: MatchPosition | undefined): BoardPointDto | null =>
  position
    ? { x: position.x, y: position.y, recordedAt: position.recordedAt }
    : null;

export class BoardMapper {
  /**
   * `roster` = contratos vigentes de los dos equipos (los que participan);
   * `latest` = último registro de cada jugador y de la pelota.
   */
  static toResponseDto(
    match: Match,
    roster: TeamPlayerResponseDto[],
    latest: MatchPosition[],
  ): BoardResponseDto {
    const home: BoardTeamDto = {
      id: match.homeTeam.id,
      name: match.homeTeam.name,
      side: 'HOME',
    };
    const away: BoardTeamDto = {
      id: match.awayTeam.id,
      name: match.awayTeam.name,
      side: 'AWAY',
    };
    const byPlayer = new Map(
      latest.filter((p) => p.player).map((p) => [p.player!.id, p]),
    );
    const ballPosition = latest.find((p) => p.ball);

    const players: BoardPlayerDto[] = roster.map((contract) => ({
      id: contract.player.id,
      fullName: contract.player.fullName,
      position: contract.player.position,
      team: contract.team.id === home.id ? home : away,
      location: toPoint(byPlayer.get(contract.player.id)),
    }));

    const dto = new BoardResponseDto();
    dto.matchId = match.id;
    dto.status = match.status;
    dto.homeTeam = home;
    dto.awayTeam = away;
    dto.ball = {
      id: match.ball.id,
      brand: match.ball.brand,
      model: match.ball.model,
      location: toPoint(ballPosition),
    };
    dto.players = players;
    return dto;
  }
}
