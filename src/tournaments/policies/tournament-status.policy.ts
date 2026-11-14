import type { Tournament } from '../entities/tournament.entity';
import { TournamentStatus } from '../enums/tournament-status.enum';
import { ApplicationException, ErrorCase } from '../../common/exceptions';

/**
 * Qué permite cada estado del torneo. Única fuente de verdad de los estados
 * "cerrado" y "bloqueado", de las transiciones y de la ventana de inscripción.
 * Sin dependencias: se usa como clase estática desde cualquier módulo.
 */
export class TournamentStatusPolicy {
  // Transiciones permitidas: solo se avanza, y se puede cancelar desde
  // cualquier estado salvo FINISHED.
  static readonly ALLOWED_TRANSITIONS: Readonly<
    Record<TournamentStatus, readonly TournamentStatus[]>
  > = {
    [TournamentStatus.PLANNED]: [
      TournamentStatus.REGISTRATION_OPEN,
      TournamentStatus.CANCELLED,
    ],
    [TournamentStatus.REGISTRATION_OPEN]: [
      TournamentStatus.IN_PROGRESS,
      TournamentStatus.CANCELLED,
    ],
    [TournamentStatus.IN_PROGRESS]: [
      TournamentStatus.FINISHED,
      TournamentStatus.CANCELLED,
    ],
    [TournamentStatus.FINISHED]: [],
    [TournamentStatus.CANCELLED]: [],
  };

  // Torneo terminado: ya no se cambian sus fases, escenarios ni grupos.
  static readonly CLOSED: readonly TournamentStatus[] = [
    TournamentStatus.FINISHED,
    TournamentStatus.CANCELLED,
  ];

  // En estos estados ya no se pueden cambiar nombre, deporte ni fechas.
  static readonly LOCKED: readonly TournamentStatus[] = [
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.FINISHED,
    TournamentStatus.CANCELLED,
  ];

  static readonly MIN_REGISTRATIONS_TO_START = 2;

  static canTransition(from: TournamentStatus, to: TournamentStatus): boolean {
    return TournamentStatusPolicy.ALLOWED_TRANSITIONS[from].includes(to);
  }

  /**
   * Lanza si no se puede pasar de `from` a `to`. Para iniciar (IN_PROGRESS)
   * exige al menos MIN_REGISTRATIONS_TO_START inscripciones activas.
   */
  static assertTransition(
    from: TournamentStatus,
    to: TournamentStatus,
    activeRegistrations: number,
  ): void {
    if (!TournamentStatusPolicy.canTransition(from, to)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede pasar de ${from} a ${to}`,
      );
    }
    if (
      to === TournamentStatus.IN_PROGRESS &&
      activeRegistrations < TournamentStatusPolicy.MIN_REGISTRATIONS_TO_START
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Para iniciar el torneo se necesitan al menos ` +
          `${TournamentStatusPolicy.MIN_REGISTRATIONS_TO_START} inscripciones activas ` +
          `(tiene ${activeRegistrations})`,
      );
    }
  }

  static isClosed(status: TournamentStatus): boolean {
    return TournamentStatusPolicy.CLOSED.includes(status);
  }

  static isLocked(status: TournamentStatus): boolean {
    return TournamentStatusPolicy.LOCKED.includes(status);
  }

  // Periodo abierto: estado REGISTRATION_OPEN y `now` dentro del rango.
  static assertRegistrationOpen(tournament: Tournament, now: Date): void {
    const time = now.getTime();
    const notYetOpen =
      tournament.status === TournamentStatus.PLANNED ||
      (tournament.status === TournamentStatus.REGISTRATION_OPEN &&
        time < tournament.registrationOpensAt.getTime());

    if (notYetOpen) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Las inscripciones del torneo ${tournament.name} aún no abren`,
      );
    }
    if (
      tournament.status !== TournamentStatus.REGISTRATION_OPEN ||
      time > tournament.registrationClosesAt.getTime()
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Las inscripciones del torneo ${tournament.name} están cerradas`,
      );
    }
  }
}
