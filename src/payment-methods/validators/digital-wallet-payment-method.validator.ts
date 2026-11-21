import { Injectable } from '@nestjs/common';
import type {
  IPaymentMethodValidator,
  PaymentMethodValidationInput,
} from '../../common/contracts';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { requireText } from './validator-helpers';

const WALLET_PHONE_REGEX = /^\+?\d{10,15}$/;
const WALLET_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class DigitalWalletPaymentMethodValidator implements IPaymentMethodValidator {
  supports(type: string): boolean {
    return type === PaymentMethodType.DIGITAL_WALLET;
  }

  validate(payload: PaymentMethodValidationInput): void {
    const reference = payload.reference.trim();
    if (
      !WALLET_PHONE_REGEX.test(reference) &&
      !WALLET_EMAIL_REGEX.test(reference)
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La referencia de billetera digital debe ser un celular (10 a 15 dígitos) o un correo válido',
      );
    }

    const details = payload.details ?? {};
    requireText(details, 'provider', 2, 'proveedor de la billetera');
    requireText(details, 'accountHolder', 3, 'titular de la cuenta');
  }
}

