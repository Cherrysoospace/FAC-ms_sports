import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ToBoolean, TrimSpaces } from '../../common/validation';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { PAYMENT_METHOD_TYPE_MESSAGE } from './create-payment-method.dto';

export class PaymentMethodQueryDto {
  @IsOptional()
  @IsEnum(PaymentMethodType, { message: PAYMENT_METHOD_TYPE_MESSAGE })
  type?: PaymentMethodType;

  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;

  @TrimSpaces()
  @IsOptional()
  @IsString({ message: 'El texto de búsqueda debe ser texto' })
  search?: string;
}
