import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';

// HU-GC-10: registro de método de pago por el aficionado (POST /me/payment-methods).
export class RegisterFanPaymentMethodDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del método de pago no es válido' })
  @IsInt({
    message: 'El método de pago es obligatorio y debe ser un número entero',
  })
  paymentMethodId!: number;

  @TrimSpaces()
  @MaxLength(80, { message: 'El alias no puede superar los 80 caracteres' })
  @IsString({ message: 'El alias debe ser texto' })
  @IsNotEmpty({ message: 'El alias es obligatorio' })
  alias!: string;

  @TrimSpaces()
  @MaxLength(100, {
    message: 'La referencia no puede superar los 100 caracteres',
  })
  @IsString({ message: 'La referencia debe ser texto' })
  @IsNotEmpty({ message: 'La referencia es obligatoria' })
  reference!: string;

  @IsObject({ message: 'Los detalles del método de pago son obligatorios' })
  details!: Record<string, unknown>;
}
