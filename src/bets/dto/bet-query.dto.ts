import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BetStatus } from '../enums/bet-status.enum';

export const BET_STATUS_MESSAGE = `El estado de la apuesta debe ser uno de: ${Object.values(BetStatus).join(', ')}`;

// Filtros administrativos de GET /bets.
export class BetQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El partido debe ser un número entero' })
  @Min(1, { message: 'El identificador del partido no es válido' })
  matchId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El aficionado debe ser un número entero' })
  @Min(1, { message: 'El identificador del aficionado no es válido' })
  fanId?: number;

  @IsOptional()
  @IsEnum(BetStatus, { message: BET_STATUS_MESSAGE })
  status?: BetStatus;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;
}

