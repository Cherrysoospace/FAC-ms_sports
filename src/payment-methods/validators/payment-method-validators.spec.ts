import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { CardPaymentMethodValidator } from './card-payment-method.validator';
import { PsePaymentMethodValidator } from './pse-payment-method.validator';
import { DigitalWalletPaymentMethodValidator } from './digital-wallet-payment-method.validator';
import { BankTransferPaymentMethodValidator } from './bank-transfer-payment-method.validator';

describe('Estrategias de validación de métodos de pago (HU-GC-10)', () => {
  const cardValidator = new CardPaymentMethodValidator();
  const pseValidator = new PsePaymentMethodValidator();
  const walletValidator = new DigitalWalletPaymentMethodValidator();
  const bankValidator = new BankTransferPaymentMethodValidator();
  const futureYear = new Date().getFullYear() + 2;

  describe('CardPaymentMethodValidator', () => {
    it('acepta tarjeta válida con 4 dígitos o enmascarada', () => {
      expect(cardValidator.supports(PaymentMethodType.CARD)).toBe(true);
      expect(() =>
        cardValidator.validate({
          type: PaymentMethodType.CARD,
          reference: '****4242',
          details: {
            cardHolder: 'Laura Martínez',
            brand: 'visa',
            expirationMonth: 12,
            expirationYear: futureYear,
          },
        }),
      ).not.toThrow();
    });

    it('rechaza referencia inválida o tarjeta vencida', () => {
      expect(() =>
        cardValidator.validate({
          type: PaymentMethodType.CARD,
          reference: '42',
          details: {
            cardHolder: 'Laura Martínez',
            brand: 'VISA',
            expirationMonth: 12,
            expirationYear: futureYear,
          },
        }),
      ).toThrow('últimos 4 dígitos');

      const now = new Date();
      if (now.getMonth() > 0) {
        expect(() =>
          cardValidator.validate({
            type: PaymentMethodType.CARD,
            reference: '1234',
            details: {
              cardHolder: 'Laura Martínez',
              brand: 'MASTERCARD',
              expirationMonth: now.getMonth(),
              expirationYear: now.getFullYear(),
            },
          }),
        ).toThrow('encuentra vencida');
      } else {
        expect(() =>
          cardValidator.validate({
            type: PaymentMethodType.CARD,
            reference: '1234',
            details: {
              cardHolder: 'Laura Martínez',
              brand: 'MASTERCARD',
              expirationMonth: 12,
              expirationYear: now.getFullYear() - 1,
            },
          }),
        ).toThrow('año de vencimiento');
      }
    });
  });

  describe('PsePaymentMethodValidator', () => {
    it('acepta cuenta PSE válida y rechaza datos incompletos', () => {
      expect(pseValidator.supports(PaymentMethodType.PSE)).toBe(true);
      expect(() =>
        pseValidator.validate({
          type: PaymentMethodType.PSE,
          reference: 'PSE-BANCO-01',
          details: {
            bankName: 'Bancolombia',
            personType: 'NATURAL',
            documentType: 'CC',
            documentNumber: '1004567890',
          },
        }),
      ).not.toThrow();

      expect(() =>
        pseValidator.validate({
          type: PaymentMethodType.PSE,
          reference: 'PSE-01',
          details: {
            bankName: 'Bancolombia',
            personType: 'OTRA',
            documentType: 'CC',
            documentNumber: '1004567890',
          },
        }),
      ).toThrow('NATURAL, JURIDICA');
    });
  });

  describe('DigitalWalletPaymentMethodValidator', () => {
    it('acepta celular o correo válido y rechaza referencia inválida', () => {
      expect(walletValidator.supports(PaymentMethodType.DIGITAL_WALLET)).toBe(
        true,
      );
      expect(() =>
        walletValidator.validate({
          type: PaymentMethodType.DIGITAL_WALLET,
          reference: '3001234567',
          details: { provider: 'Nequi', accountHolder: 'Laura Martínez' },
        }),
      ).not.toThrow();

      expect(() =>
        walletValidator.validate({
          type: PaymentMethodType.DIGITAL_WALLET,
          reference: 'laura@paypal.com',
          details: { provider: 'PayPal', accountHolder: 'Laura Martínez' },
        }),
      ).not.toThrow();

      expect(() =>
        walletValidator.validate({
          type: PaymentMethodType.DIGITAL_WALLET,
          reference: 'invalido',
          details: { provider: 'Nequi', accountHolder: 'Laura Martínez' },
        }),
      ).toThrow('celular (10 a 15 dígitos) o un correo válido');
    });
  });

  describe('BankTransferPaymentMethodValidator', () => {
    it('acepta número de cuenta válido y rechaza tipo de cuenta desconocido', () => {
      expect(bankValidator.supports(PaymentMethodType.BANK_TRANSFER)).toBe(
        true,
      );
      expect(() =>
        bankValidator.validate({
          type: PaymentMethodType.BANK_TRANSFER,
          reference: '12345678901',
          details: {
            bankName: 'Davivienda',
            accountType: 'SAVINGS',
            accountHolder: 'Laura Martínez',
          },
        }),
      ).not.toThrow();

      expect(() =>
        bankValidator.validate({
          type: PaymentMethodType.BANK_TRANSFER,
          reference: '12345678901',
          details: {
            bankName: 'Davivienda',
            accountType: 'CORRIENTE',
            accountHolder: 'Laura Martínez',
          },
        }),
      ).toThrow('SAVINGS, CHECKING');
    });
  });
});
