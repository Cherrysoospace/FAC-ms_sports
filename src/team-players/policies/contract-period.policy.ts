import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractStage } from '../enums/contract-stage.enum';
import {
  formatDateOnly,
  isCalendarDate,
  toDateOnly,
} from '../../common/dates/date-only';

// Fechas de día 'YYYY-MM-DD'
export interface ContractPeriod {
  startDate: string;
  endDate: string;
  releaseDate?: string | null;
}

// Reglas de fechas de un contrato equipo-jugador. Sin dependencias.
export class ContractPeriodPolicy {
  // Inicio y fin existen en el calendario y el inicio es anterior al fin.
  static assertValidPeriod(startDate: string, endDate: string): void {
    for (const date of [startDate, endDate]) {
      if (!isCalendarDate(date)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La fecha ${date} no existe`,
        );
      }
    }
    if (startDate >= endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La fecha de inicio del contrato debe ser anterior a la fecha de fin',
      );
    }
  }

  // Un contrato retirado termina el día del retiro, no en su fecha de fin.
  static effectiveEnd(period: ContractPeriod): string {
    return period.releaseDate ?? period.endDate;
  }

  // Dos periodos se cruzan si comparten al menos un día.
  static overlaps(a: ContractPeriod, b: ContractPeriod): boolean {
    return (
      a.startDate <= ContractPeriodPolicy.effectiveEnd(b) &&
      b.startDate <= ContractPeriodPolicy.effectiveEnd(a)
    );
  }

  /**
   * Vigente (CURRENT) = no retirado y hoy dentro de [inicio, fin].
   * Un contrato ACTIVE que aún no empieza es UPCOMING; uno retirado o
   * vencido es PAST (historial). Misma regla en SQL: contract-stage.sql.ts.
   */
  static stageOf(
    contract: ContractPeriod & { status: ContractStatus },
    today = new Date(),
  ): ContractStage {
    const todayDate = toDateOnly(today);
    if (contract.status === ContractStatus.RELEASED) return ContractStage.PAST;
    if (contract.startDate > todayDate) return ContractStage.UPCOMING;
    if (contract.endDate < todayDate) return ContractStage.PAST;
    return ContractStage.CURRENT;
  }

  /**
   * Fecha de retiro: la enviada o, si no viene, hoy (o el fin del contrato si
   * ya venció). Debe estar entre el inicio y el fin del contrato y no ser futura.
   */
  static resolveReleaseDate(
    period: ContractPeriod,
    requested: string | undefined,
    today = new Date(),
  ): string {
    const todayDate = toDateOnly(today);
    const releaseDate =
      requested ?? (todayDate < period.endDate ? todayDate : period.endDate);

    if (!isCalendarDate(releaseDate)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La fecha ${releaseDate} no existe`,
      );
    }
    if (releaseDate > todayDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La fecha de retiro no puede ser futura',
      );
    }
    if (releaseDate < period.startDate || releaseDate > period.endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La fecha de retiro debe estar dentro del contrato ` +
          `(${formatDateOnly(period.startDate)} – ${formatDateOnly(period.endDate)})`,
      );
    }
    return releaseDate;
  }
}
