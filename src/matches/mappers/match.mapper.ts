import { Match } from '../entities/match.entity';
import { Phase } from '../../phases/entities/phase.entity';
import { GroupPhase } from '../../phases/entities/group-phase.entity';
import { FinalPhase } from '../../phases/entities/final-phase.entity';
import { FinalRound } from '../../phases/enums/final-round.enum';
import {
  MatchBallDto,
  MatchPhaseDto,
  MatchResponseDto,
  MatchTeamDto,
  MatchVenueDto,
} from '../dto/match-response.dto';

const FINAL_ROUND_LABELS: Record<FinalRound, string> = {
  [FinalRound.ROUND_OF_16]: 'Octavos de final',
  [FinalRound.QUARTER_FINAL]: 'Cuartos de final',
  [FinalRound.SEMI_FINAL]: 'Semifinal',
  [FinalRound.THIRD_PLACE]: 'Tercer puesto',
  [FinalRound.FINAL]: 'Final',
};

export class MatchMapper {
  // Requiere phase (con tournament), homeTeam, awayTeam, venue y ball cargados.
  static toResponseDto(entity: Match): MatchResponseDto {
    const dto = new MatchResponseDto();
    dto.id = entity.id;
    dto.scheduledAt = entity.scheduledAt;
    dto.status = entity.status;
    dto.homeScore = entity.homeScore ?? null;
    dto.awayScore = entity.awayScore ?? null;
    dto.bettingOpen = entity.bettingOpen;
    dto.phase = MatchMapper.toPhaseDto(entity.phase);
    dto.homeTeam = MatchMapper.toTeamDto(entity.homeTeam);
    dto.awayTeam = MatchMapper.toTeamDto(entity.awayTeam);

    const venue = new MatchVenueDto();
    venue.id = entity.venue.id;
    venue.name = entity.venue.name;
    dto.venue = venue;

    const ball = new MatchBallDto();
    ball.id = entity.ball.id;
    ball.brand = entity.ball.brand;
    ball.model = entity.ball.model;
    dto.ball = ball;
    return dto;
  }

  static toResponseDtoList(entities: Match[]): MatchResponseDto[] {
    return entities.map((e) => MatchMapper.toResponseDto(e));
  }

  // 'Grupo A' o la ronda de la fase final ('Semifinal'...)
  static phaseLabel(phase: Phase): string {
    if (phase instanceof GroupPhase) return `Grupo ${phase.groupName}`;
    if (phase instanceof FinalPhase) return FINAL_ROUND_LABELS[phase.round];
    return phase.name;
  }

  private static toPhaseDto(phase: Phase): MatchPhaseDto {
    const dto = new MatchPhaseDto();
    dto.id = phase.id;
    dto.name = phase.name;
    dto.type = phase instanceof GroupPhase ? 'GROUP' : 'FINAL';
    dto.label = MatchMapper.phaseLabel(phase);
    dto.tournament = {
      id: phase.tournament.id,
      name: phase.tournament.name,
      status: phase.tournament.status,
    };
    return dto;
  }

  private static toTeamDto(team: { id: number; name: string }): MatchTeamDto {
    const dto = new MatchTeamDto();
    dto.id = team.id;
    dto.name = team.name;
    return dto;
  }
}
