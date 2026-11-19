import { IsEnum, IsOptional } from 'class-validator';
import { ReleaseReason } from '../enums/release-reason.enum';
import { IsDateOnly } from '../../common/validation';

export const RELEASE_REASON_MESSAGE = `El motivo debe ser uno de: ${Object.values(ReleaseReason).join(', ')}`;

// Retira al jugador de la plantilla sin borrar el contrato (historial).
export class ReleaseTeamPlayerDto {
  @IsEnum(ReleaseReason, { message: RELEASE_REASON_MESSAGE })
  reason!: ReleaseReason;

  // Ausente = hoy (o el fin del contrato si ya venció)
  @IsOptional()
  @IsDateOnly('La fecha de retiro debe tener el formato YYYY-MM-DD')
  releaseDate?: string;
}
