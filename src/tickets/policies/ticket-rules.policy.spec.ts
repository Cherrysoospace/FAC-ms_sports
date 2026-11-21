import { BusinessRuleException } from '../../common/exceptions';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { TicketRulesPolicy } from './ticket-rules.policy';

describe('TicketRulesPolicy', () => {
  describe('assertMatchPurchasable', () => {
    it('permite comprar boletos únicamente cuando el partido está SCHEDULED', () => {
      expect(() =>
        TicketRulesPolicy.assertMatchPurchasable(MatchStatus.SCHEDULED),
      ).not.toThrow();
    });

    it.each([
      MatchStatus.IN_PROGRESS,
      MatchStatus.FINISHED,
      MatchStatus.CANCELLED,
    ])('rechaza la compra cuando el partido está %s', (status) => {
      expect(() => TicketRulesPolicy.assertMatchPurchasable(status)).toThrow(
        'solo se pueden comprar boletos para partidos programados',
      );
    });
  });

  describe('assertLocationActive y escenario', () => {
    it('rechaza localidades inactivas', () => {
      expect(() =>
        TicketRulesPolicy.assertLocationActive(false, 'VIP Norte'),
      ).toThrow('Localidad'.replace('L', 'l'));
    });

    it('rechaza localidades que no pertenecen al escenario del partido', () => {
      expect(() =>
        TicketRulesPolicy.assertLocationBelongsToMatchVenue(
          2,
          1,
          'Tribuna Sur',
          'Estadio Central',
        ),
      ).toThrow('no pertenece al escenario Estadio Central');
    });
  });

  describe('assertCapacityAvailable', () => {
    it('permite emisión cuando los vendidos son menores a la capacidad', () => {
      expect(() =>
        TicketRulesPolicy.assertCapacityAvailable(49, 50, 'Occidental'),
      ).not.toThrow();
    });

    it('lanza 409 Conflict cuando el aforo está completo o superado', () => {
      expect(() =>
        TicketRulesPolicy.assertCapacityAvailable(50, 50, 'Occidental'),
      ).toThrow(BusinessRuleException);
      expect(() =>
        TicketRulesPolicy.assertCapacityAvailable(50, 50, 'Occidental'),
      ).toThrow('aforo completo: 50');
    });
  });

  describe('assertTicketDeletable y generateCode', () => {
    it('permite eliminar boletos de partidos programados o cancelados y bloquea en juego/finalizados', () => {
      expect(() =>
        TicketRulesPolicy.assertTicketDeletable(MatchStatus.SCHEDULED),
      ).not.toThrow();
      expect(() =>
        TicketRulesPolicy.assertTicketDeletable(MatchStatus.CANCELLED),
      ).not.toThrow();
      expect(() =>
        TicketRulesPolicy.assertTicketDeletable(MatchStatus.IN_PROGRESS),
      ).toThrow('partido en curso');
      expect(() =>
        TicketRulesPolicy.assertTicketDeletable(MatchStatus.FINISHED),
      ).toThrow('partido finalizado');
    });

    it('genera códigos únicos con el prefijo esperado de partido y localidad', () => {
      const code = TicketRulesPolicy.generateCode(12, 5);
      expect(code).toMatch(/^TKT-M12-L5-[0-9A-F]{8}$/);
    });
  });
});
