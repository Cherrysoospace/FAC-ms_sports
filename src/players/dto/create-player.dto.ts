import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DominantFoot } from '../enums/dominant-foot.enum';
import { IsDateOnly, TrimSpaces } from '../../common/validation';

export const DOMINANT_FOOT_MESSAGE = `El pie dominante debe ser uno de: ${Object.values(DominantFoot).join(', ')}`;
export const DOCUMENT_NUMBER_REGEX = /^[A-Z0-9-]{5,20}$/;
export const DOCUMENT_NUMBER_MESSAGE =
  'El documento solo admite letras, números y guiones (entre 5 y 20 caracteres)';
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;

/**
 * '1.053.245.678' y '1053245678' son el mismo documento: se quitan puntos y
 * espacios y se pasa a mayúsculas antes de validar y de buscar duplicados.
 */
export function NormalizeDocument(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string'
      ? value.replace(/[.\s]/g, '').toUpperCase()
      : value,
  );
}

export class CreatePlayerDto {
  // El decorador más cercano a la propiedad se registra primero y su mensaje
  // es el que muestra el filtro: así un campo ausente dice "es obligatorio".
  @TrimSpaces()
  @MaxLength(120, {
    message: 'El nombre completo no puede superar los 120 caracteres',
  })
  @IsString({ message: 'El nombre completo debe ser texto' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName!: string;

  @NormalizeDocument()
  @Matches(DOCUMENT_NUMBER_REGEX, { message: DOCUMENT_NUMBER_MESSAGE })
  @IsString({ message: 'El documento debe ser texto' })
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  documentNumber!: string;

  @IsDateOnly('La fecha de nacimiento debe tener el formato YYYY-MM-DD')
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  birthDate!: string;

  @TrimSpaces()
  @MaxLength(60, {
    message: 'La nacionalidad no puede superar los 60 caracteres',
  })
  @IsString({ message: 'La nacionalidad debe ser texto' })
  @IsNotEmpty({ message: 'La nacionalidad es obligatoria' })
  nationality!: string;

  @TrimSpaces()
  @MaxLength(40, { message: 'La posición no puede superar los 40 caracteres' })
  @IsString({ message: 'La posición debe ser texto' })
  @IsNotEmpty({ message: 'La posición es obligatoria' })
  position!: string;

  @Max(MAX_HEIGHT_CM, {
    message: `La altura no puede superar los ${MAX_HEIGHT_CM} cm`,
  })
  @Min(MIN_HEIGHT_CM, {
    message: `La altura debe ser de al menos ${MIN_HEIGHT_CM} cm`,
  })
  @IsInt({
    message:
      'La altura es obligatoria y debe ser un número entero de centímetros',
  })
  heightCm!: number;

  // Ausente o null = no aplica
  @IsOptional()
  @IsEnum(DominantFoot, { message: DOMINANT_FOOT_MESSAGE })
  dominantFoot?: DominantFoot | null;
}
