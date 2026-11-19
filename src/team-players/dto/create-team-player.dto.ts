import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { IsDateOnly } from '../../common/validation';

// Asigna un jugador a la plantilla de un equipo con las fechas del contrato.
export class CreateTeamPlayerDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del equipo no es válido' })
  @IsInt({ message: 'El equipo es obligatorio y debe ser un número entero' })
  teamId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del jugador no es válido' })
  @IsInt({ message: 'El jugador es obligatorio y debe ser un número entero' })
  playerId!: number;

  @IsDateOnly('La fecha de inicio debe tener el formato YYYY-MM-DD')
  @IsNotEmpty({ message: 'La fecha de inicio del contrato es obligatoria' })
  startDate!: string;

  @IsDateOnly('La fecha de fin debe tener el formato YYYY-MM-DD')
  @IsNotEmpty({ message: 'La fecha de fin del contrato es obligatoria' })
  endDate!: string;
}
