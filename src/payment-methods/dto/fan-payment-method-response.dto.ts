import { PaymentMethodType } from '../enums/payment-method-type.enum';

export class FanPaymentMethodCatalogDto {
  id!: number;
  name!: string;
  type!: PaymentMethodType;
  active!: boolean;
}

export class FanPaymentMethodResponseDto {
  id!: number;
  alias!: string;
  reference!: string;
  details!: Record<string, unknown>;
  active!: boolean;
  createdAt!: Date;
  fanId!: number;
  paymentMethod!: FanPaymentMethodCatalogDto;
}

