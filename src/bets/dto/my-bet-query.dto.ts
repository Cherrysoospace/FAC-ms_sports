import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BetStatus } from '../enums/bet-status.enum';
import { BET_STATUS_MESSAGE } from './bet-query.dto';

// Filtros de apuestas del aficionado autenticado (GET /me/bets).
export class MyBetQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El partido debe ser un número entero' })
  @Min(1, { message: 'El identificador del partido no es válido' })
  matchId?: number;

  @IsOptional()
  @IsEnum(BetStatus, { message: BET_STATUS_MESSAGE })
  status?: BetStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;
}
