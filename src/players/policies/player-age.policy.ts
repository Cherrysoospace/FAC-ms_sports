import { ApplicationException, ErrorCase } from '../../common/exceptions';

// Reglas de la fecha de nacimiento y cálculo de la edad. Sin dependencias.
export class PlayerAgePolicy {
  static readonly MIN_AGE = 5;
  static readonly MAX_AGE = 80;

  /**
   * La fecha debe existir en el calendario, no ser futura y dar una edad
   * entre MIN_AGE y MAX_AGE. Lanza INVALID_OPERATION (400).
   */
  static assertValidBirthDate(birthDate: string, today = new Date()): void {
    if (!PlayerAgePolicy.isCalendarDate(birthDate)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La fecha de nacimiento ${birthDate} no existe`,
      );
    }
    if (birthDate > PlayerAgePolicy.toDateOnly(today)) {
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

  // '2001-02-30' tiene el formato correcto pero no existe.
  private static isCalendarDate(value: string): boolean {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  private static toDateOnly(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
