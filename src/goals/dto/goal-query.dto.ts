import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Filtros de GET /goals
export class GoalQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El partido debe ser un número entero' })
  @Min(1, { message: 'El identificador del partido no es válido' })
  matchId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El jugador debe ser un número entero' })
  @Min(1, { message: 'El identificador del jugador no es válido' })
  playerId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;
}
