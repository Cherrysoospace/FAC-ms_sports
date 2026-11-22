import { FinalRound } from '../../phases/enums/final-round.enum';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { CurrentPhasePolicy } from './current-phase.policy';
import { MatchScore } from './match-outcome.policy';

const groupA = { id: 1, name: 'Fase de grupos', order: 1, groupName: 'A' };
const groupB = { id: 2, name: 'Fase de grupos', order: 1, groupName: 'B' };
const semi = {
  id: 10,
  name: 'Semifinal',
  order: 2,
  round: FinalRound.SEMI_FINAL,
};
const final = { id: 12, name: 'Final', order: 3, round: FinalRound.FINAL };
const third = {
  id: 11,
  name: 'Tercer puesto',
  order: 3,
  round: FinalRound.THIRD_PLACE,
};

const finished: MatchScore = {
  status: MatchStatus.FINISHED,
  homeScore: 1,
  awayScore: 0,
};
const scheduled: MatchScore = { status: MatchStatus.SCHEDULED };
const cancelled: MatchScore = { status: MatchStatus.CANCELLED };

describe('CurrentPhasePolicy.resolve', () => {
  it('null si el torneo no tiene fases', () => {
    expect(CurrentPhasePolicy.resolve([], [], new Map())).toBeNull();
  });

  it('torneo sin partidos: la primera fase', () => {
    expect(
      CurrentPhasePolicy.resolve([groupA, groupB], [semi, final], new Map()),
    ).toEqual({
      id: 1,
      name: 'Fase de grupos',
      type: 'GROUP',
      groupName: 'A',
    });
  });

  it('grupos terminados y final sin partidos: la final', () => {
    const matches = new Map([
      [1, [finished]],
      [2, [finished, cancelled]],
    ]);
    expect(
      CurrentPhasePolicy.resolve([groupA, groupB], [final], matches),
    ).toEqual({
      id: 12,
      name: 'Final',
      type: 'FINAL',
      round: FinalRound.FINAL,
    });
  });

  it('una fase con solo partidos cancelados no está terminada', () => {
    const matches = new Map([
      [1, [cancelled]],
      [10, [finished]],
    ]);
    expect(CurrentPhasePolicy.resolve([groupA], [semi], matches)).toMatchObject(
      { id: 1 },
    );
  });

  it('la fase de menor order con partidos pendientes', () => {
    const matches = new Map([
      [1, [finished]],
      [2, [finished, scheduled]],
      [10, [scheduled]],
    ]);
    expect(
      CurrentPhasePolicy.resolve([groupA, groupB], [semi], matches),
    ).toEqual({
      id: 2,
      name: 'Fase de grupos',
      type: 'GROUP',
      groupName: 'B',
    });
  });

  it('los cancelados no cuentan como pendientes', () => {
    const matches = new Map([
      [1, [finished, cancelled]],
      [10, [scheduled]],
    ]);
    expect(CurrentPhasePolicy.resolve([groupA], [semi], matches)).toEqual({
      id: 10,
      name: 'Semifinal',
      type: 'FINAL',
      round: FinalRound.SEMI_FINAL,
    });
  });

  it('si todas terminaron, la última (FINAL después de THIRD_PLACE con el mismo order)', () => {
    const matches = new Map([
      [1, [finished]],
      [10, [finished]],
      [11, [finished]],
      [12, [finished]],
    ]);
    expect(
      CurrentPhasePolicy.resolve([groupA], [final, semi, third], matches),
    ).toMatchObject({ id: 12, type: 'FINAL', round: FinalRound.FINAL });
  });

  it('empate de order entre grupos: el primero por nombre de grupo', () => {
    const matches = new Map([
      [1, [scheduled]],
      [2, [scheduled]],
    ]);
    expect(
      CurrentPhasePolicy.resolve([groupB, groupA], [], matches),
    ).toMatchObject({ id: 1, groupName: 'A' });
  });
});
