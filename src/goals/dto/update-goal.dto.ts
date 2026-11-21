import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

// Actualización parcial de una anotación. `matchId` no se cambia: se elimina y crea otra.
export class UpdateGoalDto {
  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El identificador del jugador no es válido' })
  @IsInt({ message: 'El jugador debe ser un número entero' })
  playerId?: number;

  @Type(() => Number)
  @NotNullIfPresent()
  @Max(300, { message: 'El minuto de la anotación no puede superar 300' })
  @Min(0, { message: 'El minuto de la anotación no puede ser negativo' })
  @IsInt({ message: 'El minuto debe ser un número entero' })
  minute?: number;

  @Type(() => Number)
  @NotNullIfPresent()
  @Max(10, { message: 'Los puntos de una anotación no pueden superar 10' })
  @Min(1, { message: 'Los puntos de la anotación deben ser al menos 1' })
  @IsInt({ message: 'Los puntos deben ser un número entero' })
  points?: number;

  // Enviar null o "" borra la descripción.
  @TrimSpaces()
  @IsOptional()
  @MaxLength(200, { message: 'La descripción no puede superar 200 caracteres' })
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string | null;
}
