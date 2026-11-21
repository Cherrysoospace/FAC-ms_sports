import { Injectable } from '@nestjs/common';
import type {
  IPaymentMethodValidator,
  PaymentMethodValidationInput,
} from '../../common/contracts';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import {
  requireAllowedValue,
  requireIntInRange,
  requireText,
} from './validator-helpers';

const CARD_REFERENCE_REGEX = /^(?:\*{4})?\d{4}$/;
const ALLOWED_CARD_BRANDS = ['VISA', 'MASTERCARD', 'AMEX', 'DINERS'] as const;

@Injectable()
export class CardPaymentMethodValidator implements IPaymentMethodValidator {
  supports(type: string): boolean {
    return type === PaymentMethodType.CARD;
  }

  validate(payload: PaymentMethodValidationInput): void {
    const reference = payload.reference.trim();
    if (!CARD_REFERENCE_REGEX.test(reference)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La referencia de tarjeta debe contener los últimos 4 dígitos (ej. 1234 o ****1234)',
      );
    }

    const details = payload.details ?? {};
    requireText(details, 'cardHolder', 3, 'titular de la tarjeta');
    requireAllowedValue(details, 'brand', ALLOWED_CARD_BRANDS, 'franquicia');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const expMonth = requireIntInRange(
      details,
      'expirationMonth',
      1,
      12,
      'mes de vencimiento',
    );
    const expYear = requireIntInRange(
      details,
      'expirationYear',
      currentYear,
      currentYear + 20,
      'año de vencimiento',
    );

    if (expYear === currentYear && expMonth < currentMonth) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La tarjeta ingresada se encuentra vencida',
      );
    }
  }
}

