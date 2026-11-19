import {
  IsBoolean,
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
import {
  DOCUMENT_NUMBER_MESSAGE,
  DOCUMENT_NUMBER_REGEX,
  DOMINANT_FOOT_MESSAGE,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  NormalizeDocument,
} from './create-player.dto';
import {
  IsDateOnly,
  NotNullIfPresent,
  TrimSpaces,
} from '../../common/validation';

/**
 * Actualización parcial de un jugador.
 *
 * `dominantFoot` acepta `null` (no aplica). El resto de columnas son NOT NULL:
 * si vienen se validan y solo `undefined` significa "no cambia". Por eso no
 * se usa PartialType (su `@IsOptional` deja pasar `null`) sino `@NotNullIfPresent`.
 */
export class UpdatePlayerDto {
  // El decorador más cercano a la propiedad se registra primero, así su
  // mensaje es el que muestra el filtro cuando llega null.
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(120, {
    message: 'El nombre completo no puede superar los 120 caracteres',
  })
  @IsString({ message: 'El nombre completo debe ser texto' })
  @IsNotEmpty({ message: 'El nombre completo no puede ser vacío' })
  fullName?: string;

  @NormalizeDocument()
  @NotNullIfPresent()
  @Matches(DOCUMENT_NUMBER_REGEX, { message: DOCUMENT_NUMBER_MESSAGE })
  @IsString({ message: 'El documento debe ser texto' })
  @IsNotEmpty({ message: 'El documento no puede ser vacío' })
  documentNumber?: string;

  @NotNullIfPresent()
  @IsDateOnly('La fecha de nacimiento debe tener el formato YYYY-MM-DD')
  @IsNotEmpty({ message: 'La fecha de nacimiento no puede ser vacía' })
  birthDate?: string;

  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(60, {
    message: 'La nacionalidad no puede superar los 60 caracteres',
  })
  @IsString({ message: 'La nacionalidad debe ser texto' })
  @IsNotEmpty({ message: 'La nacionalidad no puede ser vacía' })
  nationality?: string;

  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(40, { message: 'La posición no puede superar los 40 caracteres' })
  @IsString({ message: 'La posición debe ser texto' })
  @IsNotEmpty({ message: 'La posición no puede ser vacía' })
  position?: string;

  @NotNullIfPresent()
  @Max(MAX_HEIGHT_CM, {
    message: `La altura no puede superar los ${MAX_HEIGHT_CM} cm`,
  })
  @Min(MIN_HEIGHT_CM, {
    message: `La altura debe ser de al menos ${MIN_HEIGHT_CM} cm`,
  })
  @IsInt({ message: 'La altura debe ser un número entero de centímetros' })
  heightCm?: number;

  @IsOptional()
  @IsEnum(DominantFoot, { message: DOMINANT_FOOT_MESSAGE })
  dominantFoot?: DominantFoot | null;

  // Desactivar o reactivar el jugador
  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
