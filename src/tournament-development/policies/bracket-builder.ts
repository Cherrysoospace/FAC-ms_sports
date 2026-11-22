import { FinalPhase } from '../../phases/entities/final-phase.entity';
import { ROUND_SEQUENCE } from '../../phases/enums/final-round.enum';
import {
  KnockoutMatch,
  KnockoutTeam,
  KnockoutTie,
  KnockoutTieResolver,
} from './knockout-tie.resolver';

export type BracketTeam = KnockoutTeam;
export type BracketMatch = KnockoutMatch;
export type BracketTie<M extends BracketMatch = BracketMatch> = KnockoutTie<M>;

export interface BracketRound<M extends BracketMatch = BracketMatch> {
  phase: FinalPhase;
  ties: BracketTie<M>[];
}

/**
 * HU-GC-08b criterio 6: fase final a manera de llaves.
 * Las rondas se ordenan con ROUND_SEQUENCE (el mismo dueño que usa
 * FinalPhasesService), luego por orden e id. Las llaves de cada ronda las
 * resuelve KnockoutTieResolver.
 */
export class BracketBuilder {
  static build<M extends BracketMatch>(
    finalPhases: readonly FinalPhase[],
    matchesByPhase: ReadonlyMap<number, readonly M[]>,
  ): BracketRound<M>[] {
    return [...finalPhases]
      .sort(
        (a, b) =>
          ROUND_SEQUENCE[a.round] - ROUND_SEQUENCE[b.round] ||
          a.order - b.order ||
          a.id - b.id,
      )
      .map((phase) => ({
        phase,
        ties: BracketBuilder.buildTies(matchesByPhase.get(phase.id) ?? []),
      }));
  }

  static buildTies<M extends BracketMatch>(
    matches: readonly M[],
  ): BracketTie<M>[] {
    return KnockoutTieResolver.resolveAll(matches);
  }
}
