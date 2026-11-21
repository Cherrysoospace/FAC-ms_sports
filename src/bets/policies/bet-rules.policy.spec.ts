import { BetSelection } from '../enums/bet-selection.enum';
import { BetStatus } from '../enums/bet-status.enum';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { BetRulesPolicy } from './bet-rules.policy';

describe('BetRulesPolicy', () => {
  it('determina la selección ganadora según el marcador oficial', () => {
    expect(BetRulesPolicy.resolveWinningSelection(2, 1)).toBe(
      BetSelection.HOME_WIN,
    );
    expect(BetRulesPolicy.resolveWinningSelection(1, 1)).toBe(
      BetSelection.DRAW,
    );
    expect(BetRulesPolicy.resolveWinningSelection(0, 3)).toBe(
      BetSelection.AWAY_WIN,
    );
  });

  it('calcula el valor a pagar según estado y cuota fija redondeada a dos decimales', () => {
    expect(BetRulesPolicy.calculatePayout(50000, 2.35, BetStatus.WON)).toBe(
      117500,
    );
    expect(BetRulesPolicy.calculatePayout(33.33, 1.55, BetStatus.WON)).toBe(
      51.66,
    );
    expect(BetRulesPolicy.calculatePayout(50000, 2.35, BetStatus.LOST)).toBe(0);
    expect(BetRulesPolicy.calculatePayout(50000, 2.35, BetStatus.VOID)).toBe(
      50000,
    );
    expect(
      BetRulesPolicy.calculatePayout(50000, 2.35, BetStatus.CANCELLED),
    ).toBe(50000);
    expect(BetRulesPolicy.calculatePayout(50000, 2.35, BetStatus.PENDING)).toBe(
      0,
    );
  });

  it('rechaza apostar si el partido no está programado o tiene apuestas cerradas', () => {
    expect(() =>
      BetRulesPolicy.assertMatchBettable(MatchStatus.SCHEDULED, true),
    ).not.toThrow();

    expect(() =>
      BetRulesPolicy.assertMatchBettable(MatchStatus.IN_PROGRESS, true),
    ).toThrow('en curso');

    expect(() =>
      BetRulesPolicy.assertMatchBettable(MatchStatus.SCHEDULED, false),
    ).toThrow('cerradas');
  });

  it('impide modificar o cancelar apuestas si ya no están pendientes o si el partido inició', () => {
    expect(() =>
      BetRulesPolicy.assertModifiable(
        BetStatus.PENDING,
        MatchStatus.SCHEDULED,
        true,
      ),
    ).not.toThrow();

    expect(() =>
      BetRulesPolicy.assertModifiable(
        BetStatus.WON,
        MatchStatus.FINISHED,
        false,
      ),
    ).toThrow('ganada');

    expect(() =>
      BetRulesPolicy.assertCancellableByFan(
        BetStatus.PENDING,
        MatchStatus.IN_PROGRESS,
        false,
      ),
    ).toThrow('ya inició');

    expect(() => BetRulesPolicy.assertVoidableByAdmin(BetStatus.LOST)).toThrow(
      'no puede liquidarse ni anularse más de una vez',
    );
  });
});

