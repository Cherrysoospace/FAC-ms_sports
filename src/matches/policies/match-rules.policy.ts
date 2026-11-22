import { MatchStatus } from '../enums/match-status.enum';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { toDateOnly } from '../../common/dates/date-only';
import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';
import { TournamentStatusPolicy } from '../../tournaments/policies/tournament-status.policy';

// Lo que las reglas necesitan del torneo del partido.
export interface ClosableTournament {
  name: string;
  status: TournamentStatus;
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  [MatchStatus.SCHEDULED]: 'programado',
  [MatchStatus.IN_PROGRESS]: 'en curso',
  [MatchStatus.FINISHED]: 'finalizado',
  [MatchStatus.CANCELLED]: 'cancelado',
};

// Fechas 'YYYY-MM-DD' dentro de las que se puede jugar el partido
export interface PlayablePeriod {
  startDate: string;
  endDate: string;
  // De dónde salen las fechas, para el mensaje (ej. "la fase Grupo A")
  label: string;
}

// Reglas de un partido que no necesitan base de datos.
export class MatchRulesPolicy {
  /**
   * Transiciones por PATCH { status }. FINISHED no está: lo pone solo el
   * registro del resultado (HU-GC-07). Un partido terminado o cancelado no cambia.
   */
  static readonly ALLOWED_TRANSITIONS: Readonly<
    Record<MatchStatus, readonly MatchStatus[]>
  > = {
    [MatchStatus.SCHEDULED]: [MatchStatus.IN_PROGRESS, MatchStatus.CANCELLED],
    [MatchStatus.IN_PROGRESS]: [MatchStatus.CANCELLED],
    [MatchStatus.FINISHED]: [],
    [MatchStatus.CANCELLED]: [],
  };

  static assertDifferentTeams(homeTeamId: number, awayTeamId: number): void {
    if (homeTeamId === awayTeamId) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Un equipo no puede jugar contra sí mismo',
      );
    }
  }

  static assertTransition(from: MatchStatus, to: MatchStatus): void {
    if (from === to) return;
    if (!MatchRulesPolicy.ALLOWED_TRANSITIONS[from].includes(to)) {
      const hint =
        to === MatchStatus.FINISHED
          ? '. Para finalizarlo registre su resultado'
          : '';
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Un partido ${MATCH_STATUS_LABELS[from]} no puede pasar a ` +
          `${MATCH_STATUS_LABELS[to]}${hint}`,
      );
    }
  }

  // Equipos, escenario, pelota y fecha solo se cambian antes de empezar.
  static assertEditable(status: MatchStatus): void {
    if (status !== MatchStatus.SCHEDULED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido está ${MATCH_STATUS_LABELS[status]}: solo se pueden ` +
          'modificar partidos programados',
      );
    }
  }

  // HU-GC-11: el cierre o reapertura manual de apuestas solo aplica antes de iniciar el partido.
  static assertBettingToggleAllowed(status: MatchStatus): void {
    if (status !== MatchStatus.SCHEDULED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido está ${MATCH_STATUS_LABELS[status]}: solo se pueden ` +
          'abrir o cerrar apuestas en partidos programados',
      );
    }
  }

  /**
   * HU-GC-11: cambio manual de bettingOpen por PATCH.
   * - Solo con el partido programado (assertBettingToggleAllowed).
   * - No se puede dejar abiertas si el mismo PATCH lo inicia o lo cancela.
   * - No se reabren si el torneo ya terminó o fue cancelado.
   */
  static assertBettingChange(
    currentStatus: MatchStatus,
    nextStatus: MatchStatus,
    bettingOpen: boolean,
    tournament: ClosableTournament,
  ): void {
    MatchRulesPolicy.assertBettingToggleAllowed(currentStatus);
    if (nextStatus !== MatchStatus.SCHEDULED && bettingOpen) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se pueden dejar las apuestas abiertas al iniciar o cancelar el partido',
      );
    }
    if (bettingOpen) {
      MatchRulesPolicy.assertTournamentOpen(
        tournament,
        'no se pueden reabrir apuestas',
      );
    }
  }

  // Un torneo finalizado o cancelado no admite cambios en sus partidos.
  // `consequence` completa el mensaje: "El torneo X ya terminó o fue cancelado: <consequence>".
  static assertTournamentOpen(
    tournament: ClosableTournament,
    consequence: string,
  ): void {
    if (TournamentStatusPolicy.isClosed(tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo ${tournament.name} ya terminó o fue cancelado: ${consequence}`,
      );
    }
  }

  // El día del partido (hora local) debe estar dentro del periodo jugable.
  static assertWithinPeriod(scheduledAt: Date, period: PlayablePeriod): void {
    const day = toDateOnly(scheduledAt);
    if (day < period.startDate || day > period.endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La fecha del partido debe estar dentro de ${period.label} ` +
          `(${period.startDate} a ${period.endDate})`,
      );
    }
  }

  // Un partido en juego o terminado es historial: no se elimina.
  static assertDeletable(status: MatchStatus): void {
    if (status === MatchStatus.IN_PROGRESS || status === MatchStatus.FINISHED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede eliminar un partido ${MATCH_STATUS_LABELS[status]}. ` +
          'Si no se va a jugar, cancélelo',
      );
    }
  }

  // HU-GC-07: el resultado solo se registra o corrige si ya inició o finalizó.
  static assertResultRecordable(status: MatchStatus): void {
    if (status === MatchStatus.SCHEDULED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El partido aún está programado: debe iniciarse antes de registrar su resultado final',
      );
    }
    if (status === MatchStatus.CANCELLED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se puede registrar el resultado de un partido cancelado',
      );
    }
  }

  // HU-GC-07: las anotaciones solo aplican con el partido en curso o finalizado.
  static assertAnnotationsAllowed(status: MatchStatus): void {
    if (status === MatchStatus.SCHEDULED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se pueden gestionar anotaciones de un partido programado: inicie el partido primero',
      );
    }
    if (status === MatchStatus.CANCELLED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se pueden gestionar anotaciones de un partido cancelado',
      );
    }
  }
}
