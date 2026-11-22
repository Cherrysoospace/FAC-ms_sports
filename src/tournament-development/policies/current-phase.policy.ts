import { FinalRound } from '../../phases/enums/final-round.enum';
import { MatchOutcomePolicy, MatchScore } from './match-outcome.policy';

export interface CurrentPhaseGroupInput {
  id: number;
  name: string;
  order: number;
  groupName: string;
}

export interface CurrentPhaseFinalInput {
  id: number;
  name: string;
  order: number;
  round: FinalRound;
}

export type CurrentPhase =
  | { id: number; name: string; type: 'GROUP'; groupName: string }
  | { id: number; name: string; type: 'FINAL'; round: FinalRound };

type Candidate = { order: number; tiebreak: number; phase: CurrentPhase };

// THIRD_PLACE y FINAL pueden compartir order: el tercer puesto va antes,
// para que la "última fase" de un torneo terminado sea la FINAL.
const FINAL_TIEBREAK: Readonly<Partial<Record<FinalRound, number>>> = {
  [FinalRound.THIRD_PLACE]: 0,
  [FinalRound.FINAL]: 1,
};

/**
 * Fase actual del torneo (resumen de HU-GC-08b).
 * - Una fase está TERMINADA si tiene al menos un partido no cancelado y
 *   todos esos tienen resultado (FINISHED; MatchOutcomePolicy.hasResult).
 * - Fase actual = la de menor order que NO esté terminada (incluye las que
 *   aún no tienen partidos).
 * - Si todas terminaron, la última. null si el torneo no tiene fases.
 * Empates de order: grupos antes que finales, luego nombre de grupo / ronda
 * (FINAL_TIEBREAK) y por último id.
 */
export class CurrentPhasePolicy {
  static resolve(
    groups: readonly CurrentPhaseGroupInput[],
    finals: readonly CurrentPhaseFinalInput[],
    matchesByPhase: ReadonlyMap<number, readonly MatchScore[]>,
  ): CurrentPhase | null {
    const candidates = [
      ...groups.map((g) => CurrentPhasePolicy.fromGroup(g)),
      ...finals.map((f) => CurrentPhasePolicy.fromFinal(f)),
    ].sort((a, b) => CurrentPhasePolicy.compare(a, b));

    if (candidates.length === 0) return null;

    const notFinished = candidates.find(
      (candidate) =>
        !CurrentPhasePolicy.isFinished(
          matchesByPhase.get(candidate.phase.id) ?? [],
        ),
    );
    return (notFinished ?? candidates[candidates.length - 1]).phase;
  }

  static isFinished(matches: readonly MatchScore[]): boolean {
    const played = matches.filter((m) => !MatchOutcomePolicy.isCancelled(m));
    return (
      played.length > 0 && played.every((m) => MatchOutcomePolicy.hasResult(m))
    );
  }

  private static fromGroup(group: CurrentPhaseGroupInput): Candidate {
    return {
      order: group.order,
      tiebreak: 0,
      phase: {
        id: group.id,
        name: group.name,
        type: 'GROUP',
        groupName: group.groupName,
      },
    };
  }

  private static fromFinal(final: CurrentPhaseFinalInput): Candidate {
    return {
      order: final.order,
      tiebreak: 1 + (FINAL_TIEBREAK[final.round] ?? 0),
      phase: {
        id: final.id,
        name: final.name,
        type: 'FINAL',
        round: final.round,
      },
    };
  }

  private static compare(a: Candidate, b: Candidate): number {
    return (
      a.order - b.order ||
      a.tiebreak - b.tiebreak ||
      CurrentPhasePolicy.groupNameOf(a).localeCompare(
        CurrentPhasePolicy.groupNameOf(b),
        'es',
      ) ||
      a.phase.id - b.phase.id
    );
  }

  private static groupNameOf(candidate: Candidate): string {
    return candidate.phase.type === 'GROUP' ? candidate.phase.groupName : '';
  }
}
