import { FinalPhase } from '../../phases/entities/final-phase.entity';
import { FinalRound } from '../../phases/enums/final-round.enum';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { BracketBuilder, BracketMatch } from './bracket-builder';

const A = { id: 1, name: 'Águilas' };
const B = { id: 2, name: 'Búhos' };
const C = { id: 3, name: 'Cóndores' };
const D = { id: 4, name: 'Delfines' };

const finalPhase = (id: number, round: FinalRound, order: number) =>
  Object.assign(new FinalPhase(), { id, round, order, name: round });

let nextId = 1;
const match = (
  home: typeof A,
  away: typeof A,
  homeScore: number | undefined,
  awayScore: number | undefined,
  status = MatchStatus.FINISHED,
  scheduledAt = '2026-12-10T15:00:00',
): BracketMatch => ({
  id: nextId++,
  scheduledAt: new Date(scheduledAt),
  status,
  homeScore,
  awayScore,
  homeTeam: home,
  awayTeam: away,
});

describe('BracketBuilder.build', () => {
  it('ordena las rondas por la secuencia eliminatoria y no por id', () => {
    const rounds = BracketBuilder.build(
      [
        finalPhase(10, FinalRound.FINAL, 5),
        finalPhase(11, FinalRound.SEMI_FINAL, 4),
        finalPhase(12, FinalRound.QUARTER_FINAL, 3),
        finalPhase(13, FinalRound.THIRD_PLACE, 5),
        finalPhase(14, FinalRound.ROUND_OF_16, 2),
      ],
      new Map(),
    );
    expect(rounds.map((r) => r.phase.round)).toEqual([
      FinalRound.ROUND_OF_16,
      FinalRound.QUARTER_FINAL,
      FinalRound.SEMI_FINAL,
      // misma posición y mismo orden: desempata por id
      FinalRound.FINAL,
      FinalRound.THIRD_PLACE,
    ]);
  });

  it('cada ronda lleva solo sus partidos agrupados en llaves', () => {
    const semi = finalPhase(1, FinalRound.SEMI_FINAL, 2);
    const rounds = BracketBuilder.build(
      [semi],
      new Map([[1, [match(A, B, 2, 1), match(C, D, 0, 1)]]]),
    );
    expect(rounds[0].ties).toHaveLength(2);
    expect(rounds[0].ties.map((t) => t.winner?.id)).toEqual([A.id, D.id]);
  });
});

describe('BracketBuilder.buildTies', () => {
  it('ganador según el marcador', () => {
    const [tie] = BracketBuilder.buildTies([match(A, B, 1, 3)]);
    expect(tie).toMatchObject({
      teamA: A,
      teamB: B,
      teamAScore: 1,
      teamBScore: 3,
      winner: B,
    });
  });

  it('empate: sin ganador', () => {
    const [tie] = BracketBuilder.buildTies([match(A, B, 2, 2)]);
    expect(tie.winner).toBeNull();
    expect([tie.teamAScore, tie.teamBScore]).toEqual([2, 2]);
  });

  it('pendiente: sin ganador ni marcador', () => {
    const [tie] = BracketBuilder.buildTies([
      match(A, B, undefined, undefined, MatchStatus.SCHEDULED),
    ]);
    expect(tie).toMatchObject({
      teamAScore: null,
      teamBScore: null,
      winner: null,
    });
  });

  it('ida y vuelta: suma el marcador global y espera a que se jueguen ambos', () => {
    const ida = match(A, B, 2, 0, MatchStatus.FINISHED, '2026-12-10T15:00:00');
    const vuelta = match(
      B,
      A,
      1,
      0,
      MatchStatus.SCHEDULED,
      '2026-12-17T15:00:00',
    );
    const [pending] = BracketBuilder.buildTies([vuelta, ida]);
    expect(pending.matches.map((m) => m.id)).toEqual([ida.id, vuelta.id]);
    expect(pending.winner).toBeNull();

    const jugada = { ...vuelta, status: MatchStatus.FINISHED };
    const [decided] = BracketBuilder.buildTies([ida, jugada]);
    // A: 2 + 0 = 2; B: 0 + 1 = 1
    expect([decided.teamAScore, decided.teamBScore]).toEqual([2, 1]);
    expect(decided.winner).toEqual(A);
  });
});
