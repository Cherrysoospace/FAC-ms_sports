import { MatchStatus } from '../../matches/enums/match-status.enum';
import {
  STANDING_POINTS,
  StandingMatch,
  StandingsCalculator,
} from './standings-calculator';

const team = (id: number, name: string) => ({ id, name });
const A = team(1, 'Águilas');
const B = team(2, 'Búhos');
const C = team(3, 'Cóndores');
const D = team(4, 'Delfines');

const match = (
  home: { id: number; name: string },
  away: { id: number; name: string },
  homeScore: number | undefined,
  awayScore: number | undefined,
  status = MatchStatus.FINISHED,
): StandingMatch => ({
  homeTeam: home,
  awayTeam: away,
  homeScore,
  awayScore,
  status,
});

describe('StandingsCalculator.calculate', () => {
  it('usa la tabla de puntos 3/1/0', () => {
    expect(STANDING_POINTS).toEqual({ WIN: 3, DRAW: 1, LOSS: 0 });
  });

  it('victoria: 3 puntos al ganador y 0 al perdedor con PJ, PG, PP, GF, GC y DG', () => {
    const [first, second] = StandingsCalculator.calculate(
      [A, B],
      [match(A, B, 2, 0)],
    );
    expect(first).toEqual({
      position: 1,
      team: A,
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
      points: 3,
    });
    expect(second).toMatchObject({
      position: 2,
      team: B,
      played: 1,
      lost: 1,
      goalsFor: 0,
      goalsAgainst: 2,
      goalDifference: -2,
      points: 0,
    });
  });

  it('empate: 1 punto a cada equipo', () => {
    const rows = StandingsCalculator.calculate([A, B], [match(A, B, 1, 1)]);
    expect(rows.map((r) => [r.team.id, r.drawn, r.points])).toEqual([
      [1, 1, 1],
      [2, 1, 1],
    ]);
  });

  it('ignora los partidos que no están finalizados con resultado', () => {
    const rows = StandingsCalculator.calculate(
      [A, B],
      [
        match(A, B, undefined, undefined, MatchStatus.SCHEDULED),
        match(A, B, 3, 0, MatchStatus.IN_PROGRESS),
        match(B, A, 2, 0, MatchStatus.CANCELLED),
      ],
    );
    expect(rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it('incluye en cero a los equipos del grupo sin partidos', () => {
    const rows = StandingsCalculator.calculate([A, B, C], [match(A, B, 1, 0)]);
    expect(rows.find((r) => r.team.id === C.id)).toMatchObject({
      played: 0,
      points: 0,
    });
  });

  it('desempata primero por puntos', () => {
    // B gana 1, A empata 2 => B 3 pts, A 2 pts
    const rows = StandingsCalculator.calculate(
      [A, B, C, D],
      [match(A, C, 0, 0), match(A, D, 0, 0), match(B, C, 1, 0)],
    );
    expect(rows[0].team.id).toBe(B.id);
    expect(rows[1].team.id).toBe(A.id);
  });

  it('a igualdad de puntos desempata por diferencia de goles', () => {
    // A y B con 3 pts; A DG +3, B DG +1
    const rows = StandingsCalculator.calculate(
      [A, B, C, D],
      [match(B, C, 1, 0), match(A, D, 3, 0)],
    );
    expect(rows.slice(0, 2).map((r) => r.team.id)).toEqual([A.id, B.id]);
  });

  it('a igualdad de puntos y DG desempata por goles a favor', () => {
    // B gana 3-2 (GF 3), A gana 1-0 (GF 1): misma DG +1
    const rows = StandingsCalculator.calculate(
      [A, B, C, D],
      [match(A, C, 1, 0), match(B, D, 3, 2)],
    );
    expect(rows.slice(0, 2).map((r) => r.team.id)).toEqual([B.id, A.id]);
  });

  it('a igualdad de PTS, DG y GF ordena por nombre', () => {
    const rows = StandingsCalculator.calculate([C, B, A], [match(C, A, 1, 1)]);
    expect(rows.map((r) => r.team.name)).toEqual([
      'Águilas',
      'Cóndores',
      'Búhos',
    ]);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
  });
});
