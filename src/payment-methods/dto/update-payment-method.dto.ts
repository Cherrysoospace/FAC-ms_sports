import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { PAYMENT_METHOD_TYPE_MESSAGE } from './create-payment-method.dto';

export class UpdatePaymentMethodDto {
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío' })
  name?: string;

  @NotNullIfPresent()
  @IsEnum(PaymentMethodType, { message: PAYMENT_METHOD_TYPE_MESSAGE })
  type?: PaymentMethodType;

  @TrimSpaces()
  @IsOptional()
  @MaxLength(250, {
    message: 'La descripción no puede superar los 250 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string | null;

  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}

