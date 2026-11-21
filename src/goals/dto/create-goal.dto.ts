import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimSpaces } from '../../common/validation';

// HU-GC-07: registra una anotación (gol o puntos) de un jugador en un partido.
export class CreateGoalDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del partido no es válido' })
  @IsInt({ message: 'El partido es obligatorio y debe ser un número entero' })
  matchId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del jugador no es válido' })
  @IsInt({ message: 'El jugador es obligatorio y debe ser un número entero' })
  playerId!: number;

  @Type(() => Number)
  @Max(300, { message: 'El minuto de la anotación no puede superar 300' })
  @Min(0, { message: 'El minuto de la anotación no puede ser negativo' })
  @IsInt({ message: 'El minuto es obligatorio y debe ser un número entero' })
  minute!: number;

  @IsOptional()
  @Type(() => Number)
  @Max(10, { message: 'Los puntos de una anotación no pueden superar 10' })
  @Min(1, { message: 'Los puntos de la anotación deben ser al menos 1' })
  @IsInt({ message: 'Los puntos deben ser un número entero' })
  points?: number;

  // Ausente o null = sin descripción
  @TrimSpaces()
  @IsOptional()
  @MaxLength(200, { message: 'La descripción no puede superar 200 caracteres' })
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string | null;
}
