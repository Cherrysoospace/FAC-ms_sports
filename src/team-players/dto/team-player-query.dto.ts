import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ContractStatus } from '../enums/contract-status.enum';
import { ContractStage } from '../enums/contract-stage.enum';

export const CONTRACT_STATUS_MESSAGE = `El estado debe ser uno de: ${Object.values(ContractStatus).join(', ')}`;
export const CONTRACT_STAGE_MESSAGE = `La etapa debe ser una de: ${Object.values(ContractStage).join(', ')}`;

/**
 * Filtros de GET /team-players: ?teamId = plantilla del equipo; ?playerId =
 * equipos del jugador; ?stage=CURRENT = vigentes hoy; ?stage=PAST = historial.
 */
export class TeamPlayerQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El jugador debe ser un número entero' })
  @Min(1, { message: 'El identificador del jugador no es válido' })
  playerId?: number;

  @IsOptional()
  @IsEnum(ContractStatus, { message: CONTRACT_STATUS_MESSAGE })
  status?: ContractStatus;

  @IsOptional()
  @IsEnum(ContractStage, { message: CONTRACT_STAGE_MESSAGE })
  stage?: ContractStage;
}
