import { PlayerAgePolicy } from './player-age.policy';
import { ApplicationException } from '../../common/exceptions';

describe('PlayerAgePolicy', () => {
  // 19 de noviembre de 2026, hora local
  const today = new Date(2026, 10, 19);

  describe('ageOn', () => {
    it('cuenta el año cuando ya cumplió', () => {
      expect(PlayerAgePolicy.ageOn('2000-11-19', today)).toBe(26);
      expect(PlayerAgePolicy.ageOn('2000-01-01', today)).toBe(26);
    });

    it('resta un año si aún no cumple', () => {
      expect(PlayerAgePolicy.ageOn('2000-11-20', today)).toBe(25);
      expect(PlayerAgePolicy.ageOn('2000-12-01', today)).toBe(25);
    });
  });

  describe('assertValidBirthDate', () => {
    it('acepta una fecha válida', () => {
      expect(() =>
        PlayerAgePolicy.assertValidBirthDate('2002-05-10', today),
      ).not.toThrow();
    });

    it('rechaza fechas que no existen', () => {
      expect(() =>
        PlayerAgePolicy.assertValidBirthDate('2001-02-30', today),
      ).toThrow('no existe');
    });

    it('rechaza fechas futuras', () => {
      expect(() =>
        PlayerAgePolicy.assertValidBirthDate('2026-11-20', today),
      ).toThrow('no puede ser futura');
    });

    it('rechaza edades fuera del rango', () => {
      expect(() =>
        PlayerAgePolicy.assertValidBirthDate('2023-01-01', today),
      ).toThrow(ApplicationException);
      expect(() =>
        PlayerAgePolicy.assertValidBirthDate('1940-01-01', today),
      ).toThrow('entre 5 y 80');
    });
  });
});
