import { MatchRulesPolicy } from './match-rules.policy';
import { MatchStatus } from '../enums/match-status.enum';

describe('MatchRulesPolicy', () => {
  it('rechaza que un equipo juegue contra sí mismo', () => {
    expect(() => MatchRulesPolicy.assertDifferentTeams(3, 3)).toThrow(
      'contra sí mismo',
    );
    expect(() => MatchRulesPolicy.assertDifferentTeams(3, 4)).not.toThrow();
  });

  it('permite solo las transiciones definidas', () => {
    expect(() =>
      MatchRulesPolicy.assertTransition(
        MatchStatus.SCHEDULED,
        MatchStatus.IN_PROGRESS,
      ),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertTransition(
        MatchStatus.IN_PROGRESS,
        MatchStatus.SCHEDULED,
      ),
    ).toThrow();
    expect(() =>
      MatchRulesPolicy.assertTransition(
        MatchStatus.CANCELLED,
        MatchStatus.SCHEDULED,
      ),
    ).toThrow();
  });

  it('FINISHED solo llega por el resultado', () => {
    expect(() =>
      MatchRulesPolicy.assertTransition(
        MatchStatus.IN_PROGRESS,
        MatchStatus.FINISHED,
      ),
    ).toThrow('registre su resultado');
  });

  it('solo se editan partidos programados', () => {
    expect(() =>
      MatchRulesPolicy.assertEditable(MatchStatus.SCHEDULED),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertEditable(MatchStatus.IN_PROGRESS),
    ).toThrow();
  });

  it('valida la fecha dentro del periodo', () => {
    const period = {
      startDate: '2027-02-01',
      endDate: '2027-02-28',
      label: 'la fase Grupo A',
    };
    expect(() =>
      MatchRulesPolicy.assertWithinPeriod(new Date(2027, 1, 10, 15, 0), period),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertWithinPeriod(new Date(2027, 2, 1, 15, 0), period),
    ).toThrow('la fase Grupo A');
  });

  it('no elimina partidos en juego o terminados', () => {
    expect(() =>
      MatchRulesPolicy.assertDeletable(MatchStatus.CANCELLED),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertDeletable(MatchStatus.FINISHED),
    ).toThrow('cancélelo');
  });
});
