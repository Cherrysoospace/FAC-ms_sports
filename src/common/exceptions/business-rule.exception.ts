import { ConflictException } from '@nestjs/common';

/**
 * Equivalente a BusinessRuleException.java (409). Para reglas como
 * "no se puede eliminar porque tiene información asociada".
 */
export class BusinessRuleException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}
