import { PaymentMethodType } from '../enums/payment-method-type.enum';

export class PaymentMethodResponseDto {
  id!: number;
  name!: string;
  type!: PaymentMethodType;
  description!: string | null;
  active!: boolean;
  fanPaymentMethodsCount!: number;
}

