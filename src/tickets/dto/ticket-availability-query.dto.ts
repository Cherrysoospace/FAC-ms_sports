import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// Consulta de aforo disponible por localidad para un partido (GET /tickets/availability).
export class TicketAvailabilityQueryDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del partido no es válido' })
  @IsInt({ message: 'El partido es obligatorio y debe ser un número entero' })
  matchId!: number;
}
