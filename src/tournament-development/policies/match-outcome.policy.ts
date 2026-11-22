import { Match } from '../../matches/entities/match.entity';
import { MatchStatus } from '../../matches/enums/match-status.enum';

export type MatchScore = Pick<Match, 'status' | 'homeScore' | 'awayScore'>;

/**
 * HU-GC-08b criterio 8: cuándo un partido tiene resultado registrado.
 * El resultado solo se registra con PUT /matches/:id/result, que deja el
 * partido en FINISHED con ambos marcadores (HU-GC-07). Un partido cancelado
 * no tiene resultado ni queda pendiente.
 */
export class MatchOutcomePolicy {
  static hasResult(match: MatchScore): boolean {
    return (
      match.status === MatchStatus.FINISHED &&
      typeof match.homeScore === 'number' &&
      typeof match.awayScore === 'number'
    );
  }

  static isPending(match: MatchScore): boolean {
    return (
      match.status !== MatchStatus.CANCELLED &&
      !MatchOutcomePolicy.hasResult(match)
    );
  }

  static isCancelled(match: MatchScore): boolean {
    return match.status === MatchStatus.CANCELLED;
  }
}
