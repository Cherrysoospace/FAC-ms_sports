import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, Min } from 'class-validator';
import { MatchStatus } from '../enums/match-status.enum';
import { NotNullIfPresent } from '../../common/validation';

export const MATCH_STATUS_MESSAGE = `El estado debe ser uno de: ${Object.values(MatchStatus).join(', ')}`;

/**
 * Actualización parcial. Equipos, escenario, pelota y fecha solo cambian
 * mientras el partido está SCHEDULED. `status` sigue MatchRulesPolicy
 * (iniciar o cancelar). La fase no se cambia: se elimina y se crea otro.
 */
export class UpdateMatchDto {
  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El identificador del equipo local no es válido' })
  @IsInt({ message: 'El equipo local debe ser un número entero' })
  homeTeamId?: number;

  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El identificador del equipo visitante no es válido' })
  @IsInt({ message: 'El equipo visitante debe ser un número entero' })
  awayTeamId?: number;

  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El identificador del escenario no es válido' })
  @IsInt({ message: 'El escenario debe ser un número entero' })
  venueId?: number;

  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El identificador de la pelota no es válido' })
  @IsInt({ message: 'La pelota debe ser un número entero' })
  ballId?: number;

  @NotNullIfPresent()
  @IsISO8601(
    { strict: true },
    { message: 'La fecha del partido debe ser una fecha y hora ISO 8601' },
  )
  scheduledAt?: string;

  @NotNullIfPresent()
  @IsEnum(MatchStatus, { message: MATCH_STATUS_MESSAGE })
  status?: MatchStatus;

  @NotNullIfPresent()
  @IsBoolean({ message: 'bettingOpen debe ser true o false' })
  bettingOpen?: boolean;
}
