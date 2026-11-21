import { Injectable } from '@nestjs/common';
import type {
  IPaymentMethodValidator,
  PaymentMethodValidationInput,
} from '../../common/contracts';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { requireAllowedValue, requireText } from './validator-helpers';

const ALLOWED_PERSON_TYPES = ['NATURAL', 'JURIDICA'] as const;
const ALLOWED_DOC_TYPES = ['CC', 'CE', 'NIT', 'PASSPORT'] as const;
const PSE_DOCUMENT_REGEX = /^[A-Za-z0-9-]{5,20}$/;

@Injectable()
export class PsePaymentMethodValidator implements IPaymentMethodValidator {
  supports(type: string): boolean {
    return type === PaymentMethodType.PSE;
  }

  validate(payload: PaymentMethodValidationInput): void {
    if (payload.reference.trim().length < 4) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La referencia para PSE debe tener al menos 4 caracteres',
      );
    }

    const details = payload.details ?? {};
    requireText(details, 'bankName', 2, 'banco');
    requireAllowedValue(
      details,
      'personType',
      ALLOWED_PERSON_TYPES,
      'tipo de persona',
    );
    requireAllowedValue(
      details,
      'documentType',
      ALLOWED_DOC_TYPES,
      'tipo de documento',
    );

    const docNumber = requireText(
      details,
      'documentNumber',
      5,
      'número de documento',
    );
    if (!PSE_DOCUMENT_REGEX.test(docNumber)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El número de documento para PSE debe ser alfanumérico entre 5 y 20 caracteres',
      );
    }
  }
}
