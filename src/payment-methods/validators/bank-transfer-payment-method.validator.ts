import { Injectable } from '@nestjs/common';
import type {
  IPaymentMethodValidator,
  PaymentMethodValidationInput,
} from '../../common/contracts';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { requireAllowedValue, requireText } from './validator-helpers';

const ACCOUNT_NUMBER_REGEX = /^\d{6,20}$/;
const ALLOWED_ACCOUNT_TYPES = ['SAVINGS', 'CHECKING'] as const;

@Injectable()
export class BankTransferPaymentMethodValidator implements IPaymentMethodValidator {
  supports(type: string): boolean {
    return type === PaymentMethodType.BANK_TRANSFER;
  }

  validate(payload: PaymentMethodValidationInput): void {
    const reference = payload.reference.trim();
    if (!ACCOUNT_NUMBER_REGEX.test(reference)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La referencia de transferencia bancaria debe ser un número de cuenta de 6 a 20 dígitos',
      );
    }

    const details = payload.details ?? {};
    requireText(details, 'bankName', 2, 'banco');
    requireAllowedValue(
      details,
      'accountType',
      ALLOWED_ACCOUNT_TYPES,
      'tipo de cuenta',
    );
    requireText(details, 'accountHolder', 3, 'titular de la cuenta');
  }
}
