import type { Tournament } from '../entities/tournament.entity';
import {
  TournamentDates,
  TournamentDatesValidator,
} from './tournament-dates.validator';

const VALID: TournamentDates = {
  startDate: '2026-12-10',
  endDate: '2026-12-20',
  registrationOpensAt: new Date(2026, 10, 15, 8, 0),
  registrationClosesAt: new Date(2026, 11, 5, 18, 0),
};

describe('TournamentDatesValidator.assertValid', () => {
  it('acepta fechas válidas', () => {
    expect(() => TournamentDatesValidator.assertValid(VALID)).not.toThrow();
  });

  it('la apertura de inscripciones debe ser anterior a su cierre', () => {
    expect(() =>
      TournamentDatesValidator.assertValid({
        ...VALID,
        registrationOpensAt: VALID.registrationClosesAt,
      }),
    ).toThrow('La apertura de inscripciones debe ser anterior a su cierre');
  });

  it('el cierre puede ser el mismo día del inicio, pero no después', () => {
    expect(() =>
      TournamentDatesValidator.assertValid({
        ...VALID,
        registrationClosesAt: new Date(2026, 11, 10, 23, 59),
      }),
    ).not.toThrow();
    expect(() =>
      TournamentDatesValidator.assertValid({
        ...VALID,
        registrationClosesAt: new Date(2026, 11, 11, 0, 0),
      }),
    ).toThrow(
      'El cierre de inscripciones debe ser el mismo día o antes de la fecha de inicio del torneo',
    );
  });

  it('la fecha de inicio debe ser igual o anterior a la de fin', () => {
    expect(() =>
      TournamentDatesValidator.assertValid({
        ...VALID,
        endDate: VALID.startDate,
      }),
    ).not.toThrow();
    expect(() =>
      TournamentDatesValidator.assertValid({ ...VALID, endDate: '2026-12-09' }),
    ).toThrow('La fecha de inicio debe ser igual o anterior a la fecha de fin');
  });

  it('valida en orden: primero apertura/cierre, luego cierre/inicio, luego inicio/fin', () => {
    expect(() =>
      TournamentDatesValidator.assertValid({
        startDate: '2026-12-20',
        endDate: '2026-12-10',
        registrationOpensAt: new Date(2026, 11, 30),
        registrationClosesAt: new Date(2026, 11, 25),
      }),
    ).toThrow('La apertura de inscripciones debe ser anterior a su cierre');
  });
});

describe('TournamentDatesValidator.toDateOnly', () => {
  it('devuelve la fecha local YYYY-MM-DD', () => {
    expect(
      TournamentDatesValidator.toDateOnly(new Date(2026, 0, 5, 23, 30)),
    ).toBe('2026-01-05');
  });
});

describe('TournamentDatesValidator.mergeForUpdate', () => {
  const tournament = { ...VALID } as Tournament;

  it('devuelve null si el PATCH no trae fechas', () => {
    expect(
      TournamentDatesValidator.mergeForUpdate(tournament, { name: 'X' }),
    ).toBeNull();
  });

  it('combina las fechas del DTO con las guardadas', () => {
    expect(
      TournamentDatesValidator.mergeForUpdate(tournament, {
        endDate: '2026-12-31',
        registrationClosesAt: '2026-12-01T10:00:00',
      }),
    ).toEqual({
      startDate: '2026-12-10',
      endDate: '2026-12-31',
      registrationOpensAt: VALID.registrationOpensAt,
      registrationClosesAt: new Date('2026-12-01T10:00:00'),
    });
  });
});
