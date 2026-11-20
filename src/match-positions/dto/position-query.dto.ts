import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// GET /match-positions?matchId=: última posición de cada jugador y de la pelota.
export class PositionQueryDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del partido no es válido' })
  @IsInt({ message: 'matchId es obligatorio y debe ser un número entero' })
  matchId!: number;
}
