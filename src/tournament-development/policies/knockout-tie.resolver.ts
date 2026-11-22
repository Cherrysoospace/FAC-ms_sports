import { Match } from '../../matches/entities/match.entity';
import { MatchOutcomePolicy } from './match-outcome.policy';

export interface KnockoutTeam {
  id: number;
  name: string;
}

export type KnockoutMatch = Pick<
  Match,
  'id' | 'scheduledAt' | 'status' | 'homeScore' | 'awayScore'
> & {
  homeTeam: KnockoutTeam;
  awayTeam: KnockoutTeam;
};

/**
 * PENDING: algún partido no cancelado sigue sin resultado.
 * DECIDED: todos terminaron y el global tiene ganador.
 * DRAW: todos terminaron y el global está empatado (el modelo no tiene penales).
 * CANCELLED: todos los partidos de la llave se cancelaron.
 */
export type KnockoutTieStatus = 'PENDING' | 'DECIDED' | 'DRAW' | 'CANCELLED';

/**
 * Llave: los partidos entre los mismos dos equipos dentro de UNA ronda
 * (partido único o ida y vuelta). teamA es el local del primer partido.
 */
export interface KnockoutTie<M extends KnockoutMatch = KnockoutMatch> {
  teamA: KnockoutTeam;
  teamB: KnockoutTeam;
  // Global de los partidos con resultado; null si ninguno tiene resultado.
  teamAScore: number | null;
  teamBScore: number | null;
  status: KnockoutTieStatus;
  // Solo con status DECIDED
  winner: KnockoutTeam | null;
  loser: KnockoutTeam | null;
  // En orden cronológico
  matches: M[];
}

/**
 * Resuelve las llaves de UNA ronda de la fase final con el marcador global.
 * Único dueño de la regla "quién pasa la llave": lo usan BracketBuilder
 * (llaves de HU-GC-08b) y EliminatedTeamsPolicy (eliminado = perdedor).
 */
export class KnockoutTieResolver {
  static resolveAll<M extends KnockoutMatch>(
    roundMatches: readonly M[],
  ): KnockoutTie<M>[] {
    const byPair = new Map<string, M[]>();
    for (const match of KnockoutTieResolver.chronological(roundMatches)) {
      const key = KnockoutTieResolver.pairKey(match);
      const list = byPair.get(key) ?? [];
      list.push(match);
      byPair.set(key, list);
    }
    return [...byPair.values()].map((pairMatches) =>
      KnockoutTieResolver.resolve(pairMatches),
    );
  }

  // pairMatches: partidos de una misma pareja, en orden cronológico.
  private static resolve<M extends KnockoutMatch>(
    pairMatches: M[],
  ): KnockoutTie<M> {
    const teamA = pairMatches[0].homeTeam;
    const teamB = pairMatches[0].awayTeam;
    const played = pairMatches.filter((m) => MatchOutcomePolicy.hasResult(m));

    let teamAScore: number | null = null;
    let teamBScore: number | null = null;
    if (played.length > 0) {
      teamAScore = 0;
      teamBScore = 0;
      for (const m of played) {
        const aIsHome = m.homeTeam.id === teamA.id;
        teamAScore += (aIsHome ? m.homeScore : m.awayScore) as number;
        teamBScore += (aIsHome ? m.awayScore : m.homeScore) as number;
      }
    }

    const status = KnockoutTieResolver.statusOf(
      pairMatches,
      played.length,
      teamAScore,
      teamBScore,
    );
    const aWins =
      status === 'DECIDED' && (teamAScore as number) > (teamBScore as number);
    const winner = status === 'DECIDED' ? (aWins ? teamA : teamB) : null;
    const loser = status === 'DECIDED' ? (aWins ? teamB : teamA) : null;

    return {
      teamA,
      teamB,
      teamAScore,
      teamBScore,
      status,
      winner,
      loser,
      matches: pairMatches,
    };
  }

  private static statusOf(
    pairMatches: readonly KnockoutMatch[],
    playedCount: number,
    teamAScore: number | null,
    teamBScore: number | null,
  ): KnockoutTieStatus {
    if (pairMatches.some((m) => MatchOutcomePolicy.isPending(m))) {
      return 'PENDING';
    }
    if (playedCount === 0) return 'CANCELLED';
    return teamAScore === teamBScore ? 'DRAW' : 'DECIDED';
  }

  // Mismo par de equipos sin importar quién es local.
  private static pairKey(match: KnockoutMatch): string {
    const ids = [match.homeTeam.id, match.awayTeam.id].sort((a, b) => a - b);
    return ids.join('-');
  }

  private static chronological<M extends KnockoutMatch>(
    matches: readonly M[],
  ): M[] {
    return [...matches].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() ||
        a.id - b.id,
    );
  }
}
