import { toDateOnly } from '../../common/dates/date-only';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { Match } from '../../matches/entities/match.entity';
import { TeamPlayerResponseDto } from '../../team-players/dto/team-player-response.dto';
import { ContractStage } from '../../team-players/enums/contract-stage.enum';

/**
 * Reglas puras de anotaciones (HU-GC-07) sin acceso directo a base de datos.
 */
export class GoalRulesPolicy {
  /**
   * El jugador debe tener un contrato en uno de los dos equipos participantes
   * vigente en la actualidad o activo para la fecha del partido.
   */
  static assertPlayerParticipates(
    playerName: string,
    contracts: readonly TeamPlayerResponseDto[],
    match: Pick<Match, 'scheduledAt' | 'homeTeam' | 'awayTeam'>,
  ): void {
    const matchDay = toDateOnly(match.scheduledAt);
    const participantTeamIds = new Set([match.homeTeam.id, match.awayTeam.id]);

    const belongs = contracts.some((contract) => {
      if (!participantTeamIds.has(contract.team.id)) return false;
      if (contract.stage === ContractStage.CURRENT) return true;
      const effectiveEnd = contract.releaseDate ?? contract.endDate;
      return contract.startDate <= matchDay && effectiveEnd >= matchDay;
    });

    if (!belongs) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${playerName} no pertenece a ninguno de los equipos ` +
          `participantes del partido (${match.homeTeam.name} vs ${match.awayTeam.name})`,
      );
    }
  }
}
