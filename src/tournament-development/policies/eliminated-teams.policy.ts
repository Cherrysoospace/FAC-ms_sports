import { MatchOutcomePolicy, MatchScore } from './match-outcome.policy';
import { StandingRow } from './standings-calculator';
import { KnockoutMatch, KnockoutTieResolver } from './knockout-tie.resolver';

export interface EliminatedTeam {
  id: number;
  name: string;
}

export type EliminationMatch = KnockoutMatch;

export interface EliminationGroup {
  qualifiersCount?: number | null;
  // Tabla ya calculada por StandingsCalculator
  standings: readonly StandingRow[];
  matches: readonly MatchScore[];
}

/**
 * Equipos eliminados del torneo (resumen de HU-GC-08b).
 * - Fase final: el perdedor de cada llave resuelta (KnockoutTieResolver,
 *   marcador global). Una llave pendiente o con global empatado no elimina
 *   a nadie. Un partido único es una llave de un partido.
 * - Grupos: solo si el grupo terminó (tiene partidos y TODOS tienen
 *   resultado) y define qualifiersCount; se eliminan los que quedaron por
 *   debajo de ese puesto. Sin qualifiersCount no se elimina a nadie.
 * Sin repetidos, ordenados por nombre.
 */
export class EliminatedTeamsPolicy {
  static resolve(
    groups: readonly EliminationGroup[],
    // Partidos de cada ronda de la fase final (una lista por ronda)
    finalRounds: readonly (readonly EliminationMatch[])[],
  ): EliminatedTeam[] {
    const eliminated = new Map<number, EliminatedTeam>();
    const add = (team: EliminatedTeam) =>
      eliminated.set(team.id, { id: team.id, name: team.name });

    for (const roundMatches of finalRounds) {
      for (const tie of KnockoutTieResolver.resolveAll(roundMatches)) {
        if (tie.loser) add(tie.loser);
      }
    }

    for (const group of groups) {
      if (!EliminatedTeamsPolicy.isFinished(group)) continue;
      const qualifiers = group.qualifiersCount as number;
      group.standings
        .filter((row) => row.position > qualifiers)
        .forEach((row) => add(row.team));
    }

    return [...eliminated.values()].sort(
      (a, b) => a.name.localeCompare(b.name, 'es') || a.id - b.id,
    );
  }

  private static isFinished(group: EliminationGroup): boolean {
    return (
      typeof group.qualifiersCount === 'number' &&
      group.matches.length > 0 &&
      group.matches.every((match) => MatchOutcomePolicy.hasResult(match))
    );
  }
}
