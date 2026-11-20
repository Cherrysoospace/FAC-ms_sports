import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const MAX_POSITIONS_PER_SNAPSHOT = 60;

// Una posición: de un jugador (playerId) o de la pelota (ball: true).
export class PositionItemDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El jugador debe ser un número entero' })
  @Min(1, { message: 'El identificador del jugador no es válido' })
  playerId?: number;

  @IsOptional()
  @IsBoolean({ message: 'ball debe ser true o false' })
  ball?: boolean;

  // Porcentaje del campo (0 a 100)
  @Max(100, { message: 'x debe estar entre 0 y 100' })
  @Min(0, { message: 'x debe estar entre 0 y 100' })
  @IsNumber({}, { message: 'x es obligatorio y debe ser un número' })
  x!: number;

  @Max(100, { message: 'y debe estar entre 0 y 100' })
  @Min(0, { message: 'y debe estar entre 0 y 100' })
  @IsNumber({}, { message: 'y es obligatorio y debe ser un número' })
  y!: number;
}

/**
 * HU-GC-09: una "foto" del campo en un instante (la manda el simulador cada
 * 1–2 s). Todas las posiciones se guardan con la misma hora.
 */
export class RecordPositionsDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del partido no es válido' })
  @IsInt({ message: 'El partido es obligatorio y debe ser un número entero' })
  matchId!: number;

  @ValidateNested({ each: true })
  @Type(() => PositionItemDto)
  @ArrayMaxSize(MAX_POSITIONS_PER_SNAPSHOT, {
    message: `Máximo ${MAX_POSITIONS_PER_SNAPSHOT} posiciones por envío`,
  })
  @ArrayMinSize(1, { message: 'Envíe al menos una posición' })
  @IsArray({ message: 'positions debe ser una lista' })
  positions!: PositionItemDto[];
}
