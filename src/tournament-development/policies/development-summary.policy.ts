import { MatchOutcomePolicy, MatchScore } from './match-outcome.policy';

export type SummaryMatch = MatchScore;

export interface DevelopmentSummary {
  // Inscripciones ACTIVE del torneo
  teams: number;
  matches: number;
  finishedMatches: number;
  pendingMatches: number;
  cancelledMatches: number;
  goals: number;
  // Partidos con resultado sobre los no cancelados, de 0 a 100 con un decimal.
  completionPercentage: number;
}

/**
 * Resumen del avance del torneo (HU-GC-08b criterios 2 y 8).
 * Equipos = inscripciones ACTIVE del torneo (conteo que trae el repositorio).
 */
export class DevelopmentSummaryPolicy {
  static summarize(
    activeRegistrationsCount: number,
    matches: readonly SummaryMatch[],
    goalsCount: number,
  ): DevelopmentSummary {
    const finished = matches.filter((m) => MatchOutcomePolicy.hasResult(m));
    const pending = matches.filter((m) => MatchOutcomePolicy.isPending(m));
    const cancelled = matches.filter((m) => MatchOutcomePolicy.isCancelled(m));
    const playable = matches.length - cancelled.length;

    return {
      teams: activeRegistrationsCount,
      matches: matches.length,
      finishedMatches: finished.length,
      pendingMatches: pending.length,
      cancelledMatches: cancelled.length,
      goals: goalsCount,
      completionPercentage:
        playable === 0
          ? 0
          : Math.round((finished.length / playable) * 1000) / 10,
    };
  }
}
