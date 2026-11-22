import { MatchRulesPolicy } from './match-rules.policy';
import { MatchStatus } from '../enums/match-status.enum';
import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';

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

  it('solo permite abrir o cerrar apuestas manualmente en partidos programados', () => {
    expect(() =>
      MatchRulesPolicy.assertBettingToggleAllowed(MatchStatus.SCHEDULED),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertBettingToggleAllowed(MatchStatus.IN_PROGRESS),
    ).toThrow('partidos programados');
    expect(() =>
      MatchRulesPolicy.assertBettingToggleAllowed(MatchStatus.FINISHED),
    ).toThrow('partidos programados');
    expect(() =>
      MatchRulesPolicy.assertBettingToggleAllowed(MatchStatus.CANCELLED),
    ).toThrow('partidos programados');
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

  it('solo permite registrar resultado si el partido está en curso o finalizado', () => {
    expect(() =>
      MatchRulesPolicy.assertResultRecordable(MatchStatus.IN_PROGRESS),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertResultRecordable(MatchStatus.FINISHED),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertResultRecordable(MatchStatus.SCHEDULED),
    ).toThrow('debe iniciarse');
    expect(() =>
      MatchRulesPolicy.assertResultRecordable(MatchStatus.CANCELLED),
    ).toThrow('cancelado');
  });

  it('solo permite anotaciones cuando el partido está en curso o finalizado', () => {
    expect(() =>
      MatchRulesPolicy.assertAnnotationsAllowed(MatchStatus.IN_PROGRESS),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertAnnotationsAllowed(MatchStatus.FINISHED),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertAnnotationsAllowed(MatchStatus.SCHEDULED),
    ).toThrow('inicie el partido primero');
    expect(() =>
      MatchRulesPolicy.assertAnnotationsAllowed(MatchStatus.CANCELLED),
    ).toThrow('cancelado');
  });
});

describe('MatchRulesPolicy: apuestas y torneo cerrado', () => {
  const open = { name: 'Copa Caldas', status: TournamentStatus.IN_PROGRESS };
  const closed = { name: 'Copa Caldas', status: TournamentStatus.FINISHED };

  it('assertTournamentOpen: mensaje con el torneo y la consecuencia', () => {
    expect(() =>
      MatchRulesPolicy.assertTournamentOpen(open, 'no se puede'),
    ).not.toThrow();
    expect(() =>
      MatchRulesPolicy.assertTournamentOpen(
        { ...closed, status: TournamentStatus.CANCELLED },
        'no se le pueden programar partidos',
      ),
    ).toThrow(
      'El torneo Copa Caldas ya terminó o fue cancelado: no se le pueden programar partidos',
    );
  });

  it('assertBettingChange: solo con el partido programado', () => {
    expect(() =>
      MatchRulesPolicy.assertBettingChange(
        MatchStatus.IN_PROGRESS,
        MatchStatus.IN_PROGRESS,
        false,
        open,
      ),
    ).toThrow('partidos programados');
  });

  it('assertBettingChange: no deja apuestas abiertas si el mismo cambio inicia o cancela', () => {
    for (const next of [MatchStatus.IN_PROGRESS, MatchStatus.CANCELLED]) {
      expect(() =>
        MatchRulesPolicy.assertBettingChange(
          MatchStatus.SCHEDULED,
          next,
          true,
          open,
        ),
      ).toThrow(
        'No se pueden dejar las apuestas abiertas al iniciar o cancelar el partido',
      );
    }
    // Cerrarlas al iniciar sí se permite
    expect(() =>
      MatchRulesPolicy.assertBettingChange(
        MatchStatus.SCHEDULED,
        MatchStatus.IN_PROGRESS,
        false,
        open,
      ),
    ).not.toThrow();
  });

  it('assertBettingChange: no reabre apuestas en torneo cerrado, pero sí deja cerrarlas', () => {
    expect(() =>
      MatchRulesPolicy.assertBettingChange(
        MatchStatus.SCHEDULED,
        MatchStatus.SCHEDULED,
        true,
        closed,
      ),
    ).toThrow(
      'El torneo Copa Caldas ya terminó o fue cancelado: no se pueden reabrir apuestas',
    );
    expect(() =>
      MatchRulesPolicy.assertBettingChange(
        MatchStatus.SCHEDULED,
        MatchStatus.SCHEDULED,
        false,
        closed,
      ),
    ).not.toThrow();
  });
});
