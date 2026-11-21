import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';
import { NormalizeEmail, NormalizeFanDocument } from './create-fan.dto';

// Actualización administrativa parcial (`securityUserId` no es editable).
export class UpdateFanDto {
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(120, {
    message: 'El nombre completo no puede superar los 120 caracteres',
  })
  @IsString({ message: 'El nombre completo debe ser texto' })
  @IsNotEmpty({ message: 'El nombre completo no puede quedar vacío' })
  fullName?: string;

  @NormalizeFanDocument()
  @NotNullIfPresent()
  @MaxLength(20, {
    message: 'El documento no puede superar los 20 caracteres',
  })
  @IsString({ message: 'El documento debe ser texto' })
  @IsNotEmpty({ message: 'El documento no puede quedar vacío' })
  documentNumber?: string;

  @NormalizeEmail()
  @NotNullIfPresent()
  @MaxLength(150, { message: 'El correo no puede superar los 150 caracteres' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico no puede quedar vacío' })
  email?: string;

  // Enviar null o "" limpia el teléfono
  @TrimSpaces()
  @IsOptional()
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  @IsString({ message: 'El teléfono debe ser texto' })
  phone?: string | null;

  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}

