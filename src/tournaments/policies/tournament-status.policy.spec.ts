import type { Tournament } from '../entities/tournament.entity';
import { TournamentStatus } from '../enums/tournament-status.enum';
import { TournamentStatusPolicy } from './tournament-status.policy';

const { PLANNED, REGISTRATION_OPEN, IN_PROGRESS, FINISHED, CANCELLED } =
  TournamentStatus;

const ALL = [PLANNED, REGISTRATION_OPEN, IN_PROGRESS, FINISHED, CANCELLED];

// Pares permitidos; todo lo demás está prohibido.
const ALLOWED: [TournamentStatus, TournamentStatus][] = [
  [PLANNED, REGISTRATION_OPEN],
  [PLANNED, CANCELLED],
  [REGISTRATION_OPEN, IN_PROGRESS],
  [REGISTRATION_OPEN, CANCELLED],
  [IN_PROGRESS, FINISHED],
  [IN_PROGRESS, CANCELLED],
];
const isAllowed = (from: TournamentStatus, to: TournamentStatus) =>
  ALLOWED.some(([f, t]) => f === from && t === to);

describe('TournamentStatusPolicy.canTransition', () => {
  it.each(ALLOWED)('permite %s → %s', (from, to) => {
    expect(TournamentStatusPolicy.canTransition(from, to)).toBe(true);
  });

  const forbidden = ALL.flatMap((from) =>
    ALL.filter((to) => !isAllowed(from, to)).map(
      (to) => [from, to] as [TournamentStatus, TournamentStatus],
    ),
  );
  it.each(forbidden)('prohíbe %s → %s', (from, to) => {
    expect(TournamentStatusPolicy.canTransition(from, to)).toBe(false);
  });
});

describe('TournamentStatusPolicy.assertTransition', () => {
  it('lanza "No se puede pasar de X a Y" al retroceder o saltar', () => {
    expect(() =>
      TournamentStatusPolicy.assertTransition(REGISTRATION_OPEN, PLANNED, 5),
    ).toThrow('No se puede pasar de REGISTRATION_OPEN a PLANNED');
    expect(() =>
      TournamentStatusPolicy.assertTransition(PLANNED, FINISHED, 5),
    ).toThrow('No se puede pasar de PLANNED a FINISHED');
    expect(() =>
      TournamentStatusPolicy.assertTransition(FINISHED, CANCELLED, 5),
    ).toThrow('No se puede pasar de FINISHED a CANCELLED');
  });

  it('para iniciar exige al menos 2 inscripciones activas', () => {
    expect(() =>
      TournamentStatusPolicy.assertTransition(
        REGISTRATION_OPEN,
        IN_PROGRESS,
        1,
      ),
    ).toThrow(
      'Para iniciar el torneo se necesitan al menos 2 inscripciones activas (tiene 1)',
    );
    expect(() =>
      TournamentStatusPolicy.assertTransition(
        REGISTRATION_OPEN,
        IN_PROGRESS,
        2,
      ),
    ).not.toThrow();
  });

  it('el mínimo de inscritos solo aplica al pasar a IN_PROGRESS', () => {
    expect(() =>
      TournamentStatusPolicy.assertTransition(PLANNED, REGISTRATION_OPEN, 0),
    ).not.toThrow();
    expect(() =>
      TournamentStatusPolicy.assertTransition(IN_PROGRESS, FINISHED, 0),
    ).not.toThrow();
  });
});

describe('TournamentStatusPolicy.isClosed / isLocked', () => {
  it('cerrado = FINISHED o CANCELLED', () => {
    expect(ALL.filter((s) => TournamentStatusPolicy.isClosed(s))).toEqual([
      FINISHED,
      CANCELLED,
    ]);
  });

  it('bloqueado = IN_PROGRESS, FINISHED o CANCELLED', () => {
    expect(ALL.filter((s) => TournamentStatusPolicy.isLocked(s))).toEqual([
      IN_PROGRESS,
      FINISHED,
      CANCELLED,
    ]);
  });
});

describe('TournamentStatusPolicy.assertRegistrationOpen', () => {
  const opensAt = new Date(2026, 10, 15, 8, 0);
  const closesAt = new Date(2026, 11, 5, 18, 0);
  const tournament = (status: TournamentStatus) =>
    ({
      name: 'Copa',
      status,
      registrationOpensAt: opensAt,
      registrationClosesAt: closesAt,
    }) as Tournament;
  const during = new Date(2026, 10, 20, 12, 0);

  it('antes del periodo: "aún no abren"', () => {
    expect(() =>
      TournamentStatusPolicy.assertRegistrationOpen(
        tournament(REGISTRATION_OPEN),
        new Date(2026, 10, 15, 7, 59),
      ),
    ).toThrow('Las inscripciones del torneo Copa aún no abren');
  });

  it('en PLANNED, aunque la fecha esté dentro del periodo: "aún no abren"', () => {
    expect(() =>
      TournamentStatusPolicy.assertRegistrationOpen(
        tournament(PLANNED),
        during,
      ),
    ).toThrow('Las inscripciones del torneo Copa aún no abren');
  });

  it('durante el periodo y en REGISTRATION_OPEN: no lanza', () => {
    expect(() =>
      TournamentStatusPolicy.assertRegistrationOpen(
        tournament(REGISTRATION_OPEN),
        during,
      ),
    ).not.toThrow();
    // Los extremos cuentan como abiertos
    expect(() =>
      TournamentStatusPolicy.assertRegistrationOpen(
        tournament(REGISTRATION_OPEN),
        opensAt,
      ),
    ).not.toThrow();
    expect(() =>
      TournamentStatusPolicy.assertRegistrationOpen(
        tournament(REGISTRATION_OPEN),
        closesAt,
      ),
    ).not.toThrow();
  });

  it('después del periodo: "están cerradas"', () => {
    expect(() =>
      TournamentStatusPolicy.assertRegistrationOpen(
        tournament(REGISTRATION_OPEN),
        new Date(2026, 11, 5, 18, 1),
      ),
    ).toThrow('Las inscripciones del torneo Copa están cerradas');
  });

  it.each([IN_PROGRESS, FINISHED, CANCELLED])(
    'en %s: "están cerradas"',
    (status) => {
      expect(() =>
        TournamentStatusPolicy.assertRegistrationOpen(
          tournament(status),
          during,
        ),
      ).toThrow('Las inscripciones del torneo Copa están cerradas');
    },
  );
});
