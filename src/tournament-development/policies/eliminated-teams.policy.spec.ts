import { MatchStatus } from '../../matches/enums/match-status.enum';
import {
  EliminatedTeamsPolicy,
  EliminationGroup,
  EliminationMatch,
} from './eliminated-teams.policy';
import { StandingRow } from './standings-calculator';

const A = { id: 1, name: 'Águilas' };
const B = { id: 2, name: 'Búhos' };
const C = { id: 3, name: 'Cóndores' };
const D = { id: 4, name: 'Delfines' };

let nextId = 1;
const match = (
  home: typeof A,
  away: typeof A,
  homeScore?: number,
  awayScore?: number,
  status = MatchStatus.FINISHED,
  scheduledAt = '2026-12-10T15:00:00',
): EliminationMatch => ({
  id: nextId++,
  scheduledAt: new Date(scheduledAt),
  status,
  homeScore,
  awayScore,
  homeTeam: home,
  awayTeam: away,
});

const row = (position: number, team: typeof A): StandingRow => ({
  position,
  team,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

const group = (
  qualifiersCount: number | null,
  matches: EliminationMatch[],
): EliminationGroup => ({
  qualifiersCount,
  standings: [row(1, A), row(2, B), row(3, C), row(4, D)],
  matches,
});

describe('EliminatedTeamsPolicy.resolve', () => {
  it('fase final, partido único: elimina al perdedor de cada llave', () => {
    expect(
      EliminatedTeamsPolicy.resolve(
        [],
        [[match(A, B, 2, 1), match(C, D, 0, 3)]],
      ),
    ).toEqual([B, C]);
  });

  it('ida y vuelta: el que pierde la ida pero gana el global NO queda eliminado', () => {
    // Ida A 0 - 1 B; vuelta B 0 - 3 A. Global A 3 - 1 B: eliminado B.
    const ida = match(A, B, 0, 1, MatchStatus.FINISHED, '2026-12-10T15:00:00');
    const vuelta = match(
      B,
      A,
      0,
      3,
      MatchStatus.FINISHED,
      '2026-12-17T15:00:00',
    );
    expect(EliminatedTeamsPolicy.resolve([], [[ida, vuelta]])).toEqual([B]);
  });

  it('vuelta pendiente: nadie queda eliminado tras la ida', () => {
    const ida = match(A, B, 0, 1, MatchStatus.FINISHED, '2026-12-10T15:00:00');
    const vuelta = match(
      B,
      A,
      undefined,
      undefined,
      MatchStatus.SCHEDULED,
      '2026-12-17T15:00:00',
    );
    expect(EliminatedTeamsPolicy.resolve([], [[ida, vuelta]])).toEqual([]);
  });

  it('fase final: global empatado, partido en curso o cancelado no eliminan a nadie', () => {
    expect(
      EliminatedTeamsPolicy.resolve(
        [],
        [
          [match(A, B, 1, 1), match(C, D, 2, 0, MatchStatus.IN_PROGRESS)],
          [match(A, D, undefined, undefined, MatchStatus.CANCELLED)],
        ],
      ),
    ).toEqual([]);
  });

  it('grupo terminado: elimina a los que quedaron por debajo de qualifiersCount', () => {
    const played = [match(A, B, 1, 0), match(C, D, 2, 2)];
    expect(EliminatedTeamsPolicy.resolve([group(2, played)], [])).toEqual([
      C,
      D,
    ]);
  });

  it('grupo sin terminar (o con un partido cancelado) no elimina a nadie', () => {
    const pending = [
      match(A, B, 1, 0),
      match(C, D, undefined, undefined, MatchStatus.SCHEDULED),
    ];
    const withCancelled = [
      match(A, B, 1, 0),
      match(C, D, undefined, undefined, MatchStatus.CANCELLED),
    ];
    expect(
      EliminatedTeamsPolicy.resolve(
        [group(2, pending), group(2, withCancelled)],
        [],
      ),
    ).toEqual([]);
  });

  it('sin qualifiersCount o sin partidos no elimina a nadie por grupos', () => {
    expect(
      EliminatedTeamsPolicy.resolve(
        [group(null, [match(A, B, 1, 0)]), group(2, [])],
        [],
      ),
    ).toEqual([]);
  });

  it('sin repetidos y ordenados por nombre', () => {
    // D queda eliminado en el grupo y además pierde en la final
    const played = [match(A, B, 1, 0), match(C, D, 2, 2)];
    expect(
      EliminatedTeamsPolicy.resolve(
        [group(3, played)],
        [[match(B, D, 1, 0)], [match(A, B, 2, 0)]],
      ),
    ).toEqual([B, D]);
  });
});
