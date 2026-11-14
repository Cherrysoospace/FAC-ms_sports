import type { Tournament } from '../entities/tournament.entity';
import type { UpdateTournamentDto } from '../dto/update-tournament.dto';
import { ApplicationException, ErrorCase } from '../../common/exceptions';

export interface TournamentDates {
  // Fechas de día 'YYYY-MM-DD'
  startDate: string;
  endDate: string;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
}

// Reglas de fechas del torneo. Sin dependencias.
export class TournamentDatesValidator {
  /**
   * apertura < cierre de inscripciones; día del cierre <= inicio;
   * inicio <= fin. Lanza INVALID_OPERATION con la primera regla que falla.
   */
  static assertValid(dates: TournamentDates): void {
    if (
      dates.registrationOpensAt.getTime() >=
      dates.registrationClosesAt.getTime()
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La apertura de inscripciones debe ser anterior a su cierre',
      );
    }
    if (
      TournamentDatesValidator.toDateOnly(dates.registrationClosesAt) >
      dates.startDate
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El cierre de inscripciones debe ser el mismo día o antes de la ' +
          'fecha de inicio del torneo',
      );
    }
    // Las fechas YYYY-MM-DD se pueden comparar como texto.
    if (dates.startDate > dates.endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La fecha de inicio debe ser igual o anterior a la fecha de fin',
      );
    }
  }

  // Fecha local YYYY-MM-DD de un datetime (misma zona con que se guarda).
  static toDateOnly(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  /**
   * Fechas finales de un PATCH (las del DTO combinadas con las guardadas).
   * null si el DTO no trae ninguna fecha: en ese caso no se validan.
   */
  static mergeForUpdate(
    tournament: Tournament,
    dto: UpdateTournamentDto,
  ): TournamentDates | null {
    if (
      dto.startDate === undefined &&
      dto.endDate === undefined &&
      dto.registrationOpensAt === undefined &&
      dto.registrationClosesAt === undefined
    ) {
      return null;
    }
    return {
      startDate: dto.startDate ?? tournament.startDate,
      endDate: dto.endDate ?? tournament.endDate,
      registrationOpensAt:
        dto.registrationOpensAt !== undefined
          ? new Date(dto.registrationOpensAt)
          : tournament.registrationOpensAt,
      registrationClosesAt:
        dto.registrationClosesAt !== undefined
          ? new Date(dto.registrationClosesAt)
          : tournament.registrationClosesAt,
    };
  }
}
