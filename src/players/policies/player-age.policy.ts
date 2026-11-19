import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { isCalendarDate, toDateOnly } from '../../common/dates/date-only';

// Reglas de la fecha de nacimiento y cálculo de la edad. Sin dependencias.
export class PlayerAgePolicy {
  static readonly MIN_AGE = 5;
  static readonly MAX_AGE = 80;

  /**
   * La fecha debe existir en el calendario, no ser futura y dar una edad
   * entre MIN_AGE y MAX_AGE. Lanza INVALID_OPERATION (400).
   */
  static assertValidBirthDate(birthDate: string, today = new Date()): void {
    if (!isCalendarDate(birthDate)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La fecha de nacimiento ${birthDate} no existe`,
      );
    }
    if (birthDate > toDateOnly(today)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La fecha de nacimiento no puede ser futura',
      );
    }
    const age = PlayerAgePolicy.ageOn(birthDate, today);
    if (age < PlayerAgePolicy.MIN_AGE || age > PlayerAgePolicy.MAX_AGE) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La edad del jugador debe estar entre ${PlayerAgePolicy.MIN_AGE} y ` +
          `${PlayerAgePolicy.MAX_AGE} años (según la fecha tendría ${age})`,
      );
    }
  }

  // Años cumplidos a la fecha `today` (hora local).
  static ageOn(birthDate: string, today = new Date()): number {
    const [year, month, day] = birthDate.split('-').map(Number);
    const hadBirthday =
      today.getMonth() + 1 > month ||
      (today.getMonth() + 1 === month && today.getDate() >= day);
    return today.getFullYear() - year - (hadBirthday ? 0 : 1);
  }
}
