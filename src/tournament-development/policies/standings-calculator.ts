import { Match } from '../../matches/entities/match.entity';
import { MatchOutcomePolicy } from './match-outcome.policy';

export interface StandingTeam {
  id: number;
  name: string;
}

export type StandingMatch = Pick<
  Match,
  'status' | 'homeScore' | 'awayScore'
> & {
  homeTeam: StandingTeam;
  awayTeam: StandingTeam;
};

export interface StandingRow {
  position: number;
  team: StandingTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

type Outcome = 'WIN' | 'DRAW' | 'LOSS';

// Puntos por resultado. Cambiar el sistema de puntos solo toca esta tabla.
export const STANDING_POINTS: Readonly<Record<Outcome, number>> = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
};

/**
 * HU-GC-08b criterio 5: tabla de posiciones de UN grupo.
 * Solo cuentan los partidos con resultado registrado (FINISHED con marcador).
 * Desempate: puntos, diferencia de goles, goles a favor y nombre del equipo.
 * Los equipos sin partidos jugados aparecen con todo en cero.
 */
export class StandingsCalculator {
  static calculate(
    teams: readonly StandingTeam[],
    matches: readonly StandingMatch[],
  ): StandingRow[] {
    const rows = new Map<number, StandingRow>(
      teams.map((team) => [team.id, StandingsCalculator.emptyRow(team)]),
    );

    for (const match of matches) {
      if (!MatchOutcomePolicy.hasResult(match)) continue;
      const home = match.homeScore as number;
      const away = match.awayScore as number;
      StandingsCalculator.apply(rows.get(match.homeTeam.id), home, away);
      StandingsCalculator.apply(rows.get(match.awayTeam.id), away, home);
    }

    return [...rows.values()]
      .sort((a, b) => StandingsCalculator.compare(a, b))
      .map((row, index) => ({ ...row, position: index + 1 }));
  }

  private static emptyRow(team: StandingTeam): StandingRow {
    return {
      position: 0,
      team: { id: team.id, name: team.name },
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  private static outcomeOf(scored: number, conceded: number): Outcome {
    if (scored > conceded) return 'WIN';
    if (scored === conceded) return 'DRAW';
    return 'LOSS';
  }

  // Un lado del partido; si el equipo no es del grupo (row undefined) se ignora.
  private static apply(
    row: StandingRow | undefined,
    scored: number,
    conceded: number,
  ): void {
    if (!row) return;
    const outcome = StandingsCalculator.outcomeOf(scored, conceded);
    row.played += 1;
    if (outcome === 'WIN') row.won += 1;
    if (outcome === 'DRAW') row.drawn += 1;
    if (outcome === 'LOSS') row.lost += 1;
    row.goalsFor += scored;
    row.goalsAgainst += conceded;
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.points += STANDING_POINTS[outcome];
  }

  private static compare(a: StandingRow, b: StandingRow): number {
    return (
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name, 'es') ||
      a.team.id - b.team.id
    );
  }
}
