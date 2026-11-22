import { MatchStatus } from '../../matches/enums/match-status.enum';
import { KnockoutMatch, KnockoutTieResolver } from './knockout-tie.resolver';

const A = { id: 1, name: 'Águilas' };
const B = { id: 2, name: 'Búhos' };
const C = { id: 3, name: 'Cóndores' };
const D = { id: 4, name: 'Delfines' };

let nextId = 1;
const match = (
  home: typeof A,
  away: typeof A,
  homeScore: number | undefined,
  awayScore: number | undefined,
  status = MatchStatus.FINISHED,
  scheduledAt = '2026-12-10T15:00:00',
): KnockoutMatch => ({
  id: nextId++,
  scheduledAt: new Date(scheduledAt),
  status,
  homeScore,
  awayScore,
  homeTeam: home,
  awayTeam: away,
});

describe('KnockoutTieResolver.resolveAll', () => {
  it('partido único: es una llave de un partido con ganador y perdedor', () => {
    const [tie] = KnockoutTieResolver.resolveAll([match(A, B, 1, 3)]);
    expect(tie).toMatchObject({
      teamA: A,
      teamB: B,
      teamAScore: 1,
      teamBScore: 3,
      status: 'DECIDED',
      winner: B,
      loser: A,
    });
    expect(tie.matches).toHaveLength(1);
  });

  it('agrupa por pareja sin importar quién es local, una llave por pareja', () => {
    const ties = KnockoutTieResolver.resolveAll([
      match(A, B, 1, 0, MatchStatus.FINISHED, '2026-12-10T15:00:00'),
      match(C, D, 0, 2, MatchStatus.FINISHED, '2026-12-11T15:00:00'),
      match(B, A, 0, 0, MatchStatus.FINISHED, '2026-12-17T15:00:00'),
    ]);
    expect(ties).toHaveLength(2);
    expect(ties.map((t) => t.matches.length)).toEqual([2, 1]);
  });

  it('ida y vuelta: el que pierde la ida gana el global', () => {
    // Ida: A 0 - 1 B. Vuelta: B 0 - 3 A. Global A 3 - 1 B.
    const ida = match(A, B, 0, 1, MatchStatus.FINISHED, '2026-12-10T15:00:00');
    const vuelta = match(
      B,
      A,
      0,
      3,
      MatchStatus.FINISHED,
      '2026-12-17T15:00:00',
    );
    const [tie] = KnockoutTieResolver.resolveAll([vuelta, ida]);
    expect(tie.matches.map((m) => m.id)).toEqual([ida.id, vuelta.id]);
    expect(tie).toMatchObject({
      teamAScore: 3,
      teamBScore: 1,
      status: 'DECIDED',
      winner: A,
      loser: B,
    });
  });

  it('global empatado: sin ganador ni perdedor (no hay penales)', () => {
    const [tie] = KnockoutTieResolver.resolveAll([
      match(A, B, 2, 1, MatchStatus.FINISHED, '2026-12-10T15:00:00'),
      match(B, A, 1, 0, MatchStatus.FINISHED, '2026-12-17T15:00:00'),
    ]);
    expect(tie).toMatchObject({
      teamAScore: 2,
      teamBScore: 2,
      status: 'DRAW',
      winner: null,
      loser: null,
    });
  });

  it('vuelta pendiente: llave pendiente aunque la ida tenga ganador', () => {
    const [tie] = KnockoutTieResolver.resolveAll([
      match(A, B, 0, 1, MatchStatus.FINISHED, '2026-12-10T15:00:00'),
      match(
        B,
        A,
        undefined,
        undefined,
        MatchStatus.SCHEDULED,
        '2026-12-17T15:00:00',
      ),
    ]);
    expect(tie).toMatchObject({
      teamAScore: 0,
      teamBScore: 1,
      status: 'PENDING',
      winner: null,
      loser: null,
    });
  });

  it('un partido cancelado no deja la llave pendiente; todo cancelado = CANCELLED', () => {
    const [withCancelled] = KnockoutTieResolver.resolveAll([
      match(A, B, 2, 0, MatchStatus.FINISHED, '2026-12-10T15:00:00'),
      match(
        B,
        A,
        undefined,
        undefined,
        MatchStatus.CANCELLED,
        '2026-12-17T15:00:00',
      ),
    ]);
    expect(withCancelled).toMatchObject({ status: 'DECIDED', winner: A });

    const [allCancelled] = KnockoutTieResolver.resolveAll([
      match(C, D, undefined, undefined, MatchStatus.CANCELLED),
    ]);
    expect(allCancelled).toMatchObject({
      status: 'CANCELLED',
      teamAScore: null,
      winner: null,
    });
  });
});
