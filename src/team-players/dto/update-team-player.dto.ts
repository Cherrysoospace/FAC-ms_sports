import { IsNotEmpty } from 'class-validator';
import { IsDateOnly, NotNullIfPresent } from '../../common/validation';

/**
 * Corrige las fechas de un contrato vigente. El equipo y el jugador no se
 * cambian: para eso se retira el contrato y se crea otro (queda el historial).
 */
export class UpdateTeamPlayerDto {
  @NotNullIfPresent()
  @IsDateOnly('La fecha de inicio debe tener el formato YYYY-MM-DD')
  @IsNotEmpty({ message: 'La fecha de inicio no puede ser vacía' })
  startDate?: string;

  @NotNullIfPresent()
  @IsDateOnly('La fecha de fin debe tener el formato YYYY-MM-DD')
  @IsNotEmpty({ message: 'La fecha de fin no puede ser vacía' })
  endDate?: string;
}
