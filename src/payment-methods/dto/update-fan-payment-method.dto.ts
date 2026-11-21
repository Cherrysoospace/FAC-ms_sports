import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

export class UpdateFanPaymentMethodDto {
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(80, { message: 'El alias no puede superar los 80 caracteres' })
  @IsString({ message: 'El alias debe ser texto' })
  @IsNotEmpty({ message: 'El alias no puede quedar vacío' })
  alias?: string;

  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(100, {
    message: 'La referencia no puede superar los 100 caracteres',
  })
  @IsString({ message: 'La referencia debe ser texto' })
  @IsNotEmpty({ message: 'La referencia no puede quedar vacía' })
  reference?: string;

  @NotNullIfPresent()
  @IsObject({ message: 'Los detalles deben ser un objeto válido' })
  details?: Record<string, unknown>;

  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}

