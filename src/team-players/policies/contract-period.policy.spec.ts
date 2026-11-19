import { ContractPeriodPolicy } from './contract-period.policy';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractStage } from '../enums/contract-stage.enum';

describe('ContractPeriodPolicy', () => {
  // 19 de noviembre de 2026, hora local
  const today = new Date(2026, 10, 19);

  describe('assertValidPeriod', () => {
    it('acepta un periodo con inicio anterior al fin', () => {
      expect(() =>
        ContractPeriodPolicy.assertValidPeriod('2026-01-01', '2027-12-31'),
      ).not.toThrow();
    });

    it('rechaza inicio igual o posterior al fin', () => {
      expect(() =>
        ContractPeriodPolicy.assertValidPeriod('2027-01-01', '2027-01-01'),
      ).toThrow('anterior a la fecha de fin');
      expect(() =>
        ContractPeriodPolicy.assertValidPeriod('2027-02-01', '2027-01-01'),
      ).toThrow('anterior a la fecha de fin');
    });

    it('rechaza fechas que no existen', () => {
      expect(() =>
        ContractPeriodPolicy.assertValidPeriod('2026-02-30', '2027-01-01'),
      ).toThrow('no existe');
    });
  });

  describe('overlaps', () => {
    const contract = { startDate: '2025-01-01', endDate: '2026-12-31' };

    it('detecta periodos que comparten días', () => {
      expect(
        ContractPeriodPolicy.overlaps(contract, {
          startDate: '2026-12-31',
          endDate: '2027-06-30',
        }),
      ).toBe(true);
    });

    it('un contrato retirado termina el día del retiro', () => {
      const released = { ...contract, releaseDate: '2025-06-30' };
      expect(
        ContractPeriodPolicy.overlaps(released, {
          startDate: '2025-07-01',
          endDate: '2026-06-30',
        }),
      ).toBe(false);
    });
  });

  describe('stageOf', () => {
    const active = ContractStatus.ACTIVE;

    it('vigente si hoy está dentro del periodo', () => {
      expect(
        ContractPeriodPolicy.stageOf(
          { status: active, startDate: '2026-01-01', endDate: '2026-11-19' },
          today,
        ),
      ).toBe(ContractStage.CURRENT);
    });

    it('próximo si aún no empieza', () => {
      expect(
        ContractPeriodPolicy.stageOf(
          { status: active, startDate: '2028-01-01', endDate: '2029-12-31' },
          today,
        ),
      ).toBe(ContractStage.UPCOMING);
    });

    it('historial si venció o fue retirado', () => {
      expect(
        ContractPeriodPolicy.stageOf(
          { status: active, startDate: '2024-01-01', endDate: '2025-06-30' },
          today,
        ),
      ).toBe(ContractStage.PAST);
      expect(
        ContractPeriodPolicy.stageOf(
          {
            status: ContractStatus.RELEASED,
            startDate: '2026-01-01',
            endDate: '2027-12-31',
            releaseDate: '2026-05-01',
          },
          today,
        ),
      ).toBe(ContractStage.PAST);
    });
  });

  describe('resolveReleaseDate', () => {
    const contract = { startDate: '2026-01-01', endDate: '2027-12-31' };

    it('sin fecha usa hoy', () => {
      expect(
        ContractPeriodPolicy.resolveReleaseDate(contract, undefined, today),
      ).toBe('2026-11-19');
    });

    it('sin fecha y con el contrato vencido usa su fecha de fin', () => {
      const expired = { startDate: '2024-01-01', endDate: '2025-06-30' };
      expect(
        ContractPeriodPolicy.resolveReleaseDate(expired, undefined, today),
      ).toBe('2025-06-30');
    });

    it('rechaza fechas futuras o fuera del contrato', () => {
      expect(() =>
        ContractPeriodPolicy.resolveReleaseDate(contract, '2026-12-01', today),
      ).toThrow('no puede ser futura');
      expect(() =>
        ContractPeriodPolicy.resolveReleaseDate(contract, '2025-12-31', today),
      ).toThrow('dentro del contrato');
    });
  });
});
