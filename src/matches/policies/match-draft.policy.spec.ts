import { Match } from '../entities/match.entity';
import { GroupPhase } from '../../phases/entities/group-phase.entity';
import { MatchDraftPolicy } from './match-draft.policy';

const tournament = {
  id: 1,
  name: 'Copa Caldas',
  startDate: '2026-12-01',
  endDate: '2026-12-31',
};

const match = {
  homeTeam: { id: 1 },
  awayTeam: { id: 2 },
  venue: { id: 3 },
  ball: { id: 4 },
  scheduledAt: new Date('2026-12-05T15:00:00'),
} as unknown as Match;

describe('MatchDraftPolicy', () => {
  it('changesData: solo si llega algún dato del partido', () => {
    expect(MatchDraftPolicy.changesData({})).toBe(false);
    expect(MatchDraftPolicy.changesData({ venueId: 8 })).toBe(true);
    expect(
      MatchDraftPolicy.changesData({ scheduledAt: '2026-12-06T15:00:00' }),
    ).toBe(true);
  });

  it('fromCreate: convierte la fecha', () => {
    expect(
      MatchDraftPolicy.fromCreate({
        phaseId: 9,
        homeTeamId: 1,
        awayTeamId: 2,
        venueId: 3,
        ballId: 4,
        scheduledAt: '2026-12-05T15:00:00',
      }),
    ).toEqual({
      homeTeamId: 1,
      awayTeamId: 2,
      venueId: 3,
      ballId: 4,
      scheduledAt: new Date('2026-12-05T15:00:00'),
    });
  });

  it('mergeForUpdate: lo que llega en el PATCH o, si no, lo actual', () => {
    expect(MatchDraftPolicy.mergeForUpdate(match, {})).toEqual({
      homeTeamId: 1,
      awayTeamId: 2,
      venueId: 3,
      ballId: 4,
      scheduledAt: match.scheduledAt,
    });
    expect(
      MatchDraftPolicy.mergeForUpdate(match, {
        awayTeamId: 7,
        scheduledAt: '2026-12-09T18:00:00',
      }),
    ).toMatchObject({
      homeTeamId: 1,
      awayTeamId: 7,
      scheduledAt: new Date('2026-12-09T18:00:00'),
    });
  });

  it('playablePeriod: fechas de la fase si las tiene; si no, las del torneo', () => {
    const withDates = Object.assign(new GroupPhase(), {
      name: 'Grupo A',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      tournament,
    });
    expect(MatchDraftPolicy.playablePeriod(withDates)).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      label: 'las fechas de la fase Grupo A',
    });

    const withoutDates = Object.assign(new GroupPhase(), {
      name: 'Grupo B',
      tournament,
    });
    expect(MatchDraftPolicy.playablePeriod(withoutDates)).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      label: 'las fechas del torneo Copa Caldas',
    });
  });
});
