import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';
import { NormalizeEmail, NormalizeFanDocument } from './create-fan.dto';

// Autorregistro de perfil en POST /me/fan. El securityUserId sale del JWT.
export class RegisterMyFanDto {
  @TrimSpaces()
  @MaxLength(120, {
    message: 'El nombre completo no puede superar los 120 caracteres',
  })
  @IsString({ message: 'El nombre completo debe ser texto' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName!: string;

  @NormalizeFanDocument()
  @MaxLength(20, {
    message: 'El documento no puede superar los 20 caracteres',
  })
  @IsString({ message: 'El documento debe ser texto' })
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  documentNumber!: string;

  // Si no se envía en el cuerpo, se toma el email del token JWT.
  @NormalizeEmail()
  @IsOptional()
  @MaxLength(150, { message: 'El correo no puede superar los 150 caracteres' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  email?: string;

  @TrimSpaces()
  @IsOptional()
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  @IsString({ message: 'El teléfono debe ser texto' })
  phone?: string | null;
}
