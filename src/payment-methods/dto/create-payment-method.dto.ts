import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';
import { PaymentMethodType } from '../enums/payment-method-type.enum';

export const PAYMENT_METHOD_TYPE_MESSAGE = `El tipo debe ser uno de: ${Object.values(PaymentMethodType).join(', ')}`;

export class CreatePaymentMethodDto {
  @TrimSpaces()
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsEnum(PaymentMethodType, { message: PAYMENT_METHOD_TYPE_MESSAGE })
  @IsNotEmpty({ message: 'El tipo de método de pago es obligatorio' })
  type!: PaymentMethodType;

  @TrimSpaces()
  @IsOptional()
  @MaxLength(250, {
    message: 'La descripción no puede superar los 250 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string | null;
}
