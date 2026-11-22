import { MatchStatus } from '../../matches/enums/match-status.enum';
import { GroupParticipantsPolicy } from './group-participants.policy';
import { StandingsCalculator } from './standings-calculator';

const A = { id: 1, name: 'Águilas' };
const B = { id: 2, name: 'Búhos' };
const C = { id: 3, name: 'Cóndores' };

const match = (home: typeof A, away: typeof A, h: number, a: number) => ({
  status: MatchStatus.FINISHED,
  homeScore: h,
  awayScore: a,
  homeTeam: home,
  awayTeam: away,
});

describe('GroupParticipantsPolicy.resolve', () => {
  it('une los equipos del grupo con los de sus partidos, sin repetir', () => {
    expect(
      GroupParticipantsPolicy.resolve(
        [B, A],
        [match(A, B, 1, 0), match(A, C, 0, 0)],
      ),
    ).toEqual([A, B, C]);
  });

  it('grupo sin partidos: solo los equipos asignados', () => {
    expect(GroupParticipantsPolicy.resolve([C, A], [])).toEqual([A, C]);
  });

  it('equipo reasignado a otro torneo sigue en la tabla del grupo A', () => {
    // C jugó en el grupo A, pero hoy su group_id apunta a un grupo de otro
    // torneo: ya no viene en los equipos con group_id = A.
    const groupAMatches = [
      match(A, B, 1, 0),
      match(C, A, 2, 0),
      match(B, C, 1, 1),
    ];
    const participants = GroupParticipantsPolicy.resolve([A, B], groupAMatches);
    const table = StandingsCalculator.calculate(participants, groupAMatches);

    expect(table.map((row) => row.team.id)).toEqual([C.id, A.id, B.id]);
    expect(table.find((row) => row.team.id === C.id)).toMatchObject({
      played: 2,
      won: 1,
      drawn: 1,
      points: 4,
    });
  });
});
