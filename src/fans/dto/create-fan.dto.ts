import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';

export function NormalizeFanDocument(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string'
      ? value.replace(/[\s.-]/g, '').toUpperCase()
      : value,
  );
}

export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}

// Registro administrativo de un aficionado vinculado a su usuario en ms_security.
export class CreateFanDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador de usuario no es válido' })
  @IsInt({
    message:
      'El identificador del usuario de seguridad es obligatorio y debe ser entero',
  })
  securityUserId!: number;

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

  @NormalizeEmail()
  @MaxLength(150, { message: 'El correo no puede superar los 150 caracteres' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  // Ausente o null = sin teléfono
  @TrimSpaces()
  @IsOptional()
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  @IsString({ message: 'El teléfono debe ser texto' })
  phone?: string | null;
}

