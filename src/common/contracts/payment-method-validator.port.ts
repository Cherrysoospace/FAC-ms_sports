/**
 * Token de inyección para el conjunto de estrategias validadoras de medios de pago
 * (Patrón Strategy + OCP + DIP).
 */
export const PAYMENT_METHOD_VALIDATORS = Symbol('PAYMENT_METHOD_VALIDATORS');

/**
 * Datos mínimos que recibe toda estrategia de validación al registrar o actualizar
 * un método de pago de un aficionado. Desacopla `common/contracts` del DTO concreto.
 */
export interface PaymentMethodValidationInput {
  type: string;
  reference: string;
  label?: string;
  details?: Record<string, unknown>;
}

/**
 * Estrategia de validación por tipo de método de pago (HU-GC-10).
 * Permite agregar nuevos tipos sin modificar `PaymentMethodsService` (OCP).
 */
export interface IPaymentMethodValidator {
  supports(type: string): boolean;
  validate(payload: PaymentMethodValidationInput): void;
}

