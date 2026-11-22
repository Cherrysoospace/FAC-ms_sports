import { MatchStatus } from '../../matches/enums/match-status.enum';
import { DevelopmentSummaryPolicy } from './development-summary.policy';
import { MatchOutcomePolicy } from './match-outcome.policy';

const match = (
  status: MatchStatus,
  homeScore?: number,
  awayScore?: number,
  homeId = 1,
  awayId = 2,
) => ({
  status,
  homeScore,
  awayScore,
  homeTeam: { id: homeId },
  awayTeam: { id: awayId },
});

describe('MatchOutcomePolicy', () => {
  it('solo un partido FINISHED con ambos marcadores tiene resultado', () => {
    expect(
      MatchOutcomePolicy.hasResult(match(MatchStatus.FINISHED, 1, 0)),
    ).toBe(true);
    expect(
      MatchOutcomePolicy.hasResult(match(MatchStatus.IN_PROGRESS, 1, 0)),
    ).toBe(false);
    expect(MatchOutcomePolicy.hasResult(match(MatchStatus.FINISHED))).toBe(
      false,
    );
  });

  it('pendiente = sin resultado y no cancelado', () => {
    expect(MatchOutcomePolicy.isPending(match(MatchStatus.SCHEDULED))).toBe(
      true,
    );
    expect(MatchOutcomePolicy.isPending(match(MatchStatus.IN_PROGRESS))).toBe(
      true,
    );
    expect(MatchOutcomePolicy.isPending(match(MatchStatus.CANCELLED))).toBe(
      false,
    );
    expect(
      MatchOutcomePolicy.isPending(match(MatchStatus.FINISHED, 0, 0)),
    ).toBe(false);
  });
});

describe('DevelopmentSummaryPolicy.summarize', () => {
  it('torneo sin partidos: todo en cero y 0 %', () => {
    expect(DevelopmentSummaryPolicy.summarize(0, [], 0)).toEqual({
      teams: 0,
      matches: 0,
      finishedMatches: 0,
      pendingMatches: 0,
      cancelledMatches: 0,
      goals: 0,
      completionPercentage: 0,
    });
  });

  it('equipos = inscripciones ACTIVE (no los equipos de los partidos) y redondea a un decimal', () => {
    // 3 equipos distintos juegan, pero solo hay 5 inscripciones activas
    const summary = DevelopmentSummaryPolicy.summarize(
      5,
      [
        match(MatchStatus.FINISHED, 1, 0, 1, 2),
        match(MatchStatus.SCHEDULED, undefined, undefined, 2, 3),
        match(MatchStatus.SCHEDULED, undefined, undefined, 1, 3),
      ],
      4,
    );
    expect(summary).toMatchObject({
      teams: 5,
      matches: 3,
      finishedMatches: 1,
      pendingMatches: 2,
      goals: 4,
      completionPercentage: 33.3,
    });
  });
});
