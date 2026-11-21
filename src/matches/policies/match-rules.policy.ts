import { MatchStatus } from '../enums/match-status.enum';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { toDateOnly } from '../../common/dates/date-only';

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
