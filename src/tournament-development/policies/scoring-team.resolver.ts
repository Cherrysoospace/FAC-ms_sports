import { toDateOnly } from '../../common/dates/date-only';
import { ContractPeriodPolicy } from '../../team-players/policies/contract-period.policy';

export interface ScoringTeam {
  id: number;
  name: string;
}

export interface ScoringContract {
  startDate: string;
  endDate: string;
  releaseDate?: string | null;
  team: ScoringTeam;
}

export interface ScoringMatch {
  scheduledAt: Date;
  homeTeam: ScoringTeam;
  awayTeam: ScoringTeam;
}

/**
 * HU-GC-08b criterio 9: equipo por el que anotó el jugador.
 * La Anotación del diagrama solo se relaciona con Partido y Jugador, así que
 * el equipo se deduce de los contratos del jugador con los dos equipos del
 * partido: primero el contrato vigente el día del partido; si no hay, el
 * único equipo participante con el que tuvo contrato; si es ambiguo, null.
 */
export class ScoringTeamResolver {
  static resolve(
    match: ScoringMatch,
    contracts: readonly ScoringContract[],
  ): ScoringTeam | null {
    const participants = new Map<number, ScoringTeam>([
      [match.homeTeam.id, match.homeTeam],
      [match.awayTeam.id, match.awayTeam],
    ]);
    const candidates = contracts.filter((c) => participants.has(c.team.id));
    const matchDay = toDateOnly(new Date(match.scheduledAt));

    const onMatchDay = candidates.find(
      (c) =>
        c.startDate <= matchDay &&
        ContractPeriodPolicy.effectiveEnd(c) >= matchDay,
    );
    if (onMatchDay) return participants.get(onMatchDay.team.id) ?? null;

    const teamIds = [...new Set(candidates.map((c) => c.team.id))];
    if (teamIds.length === 1) return participants.get(teamIds[0]) ?? null;
    return null;
  }
}
