import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Filtros de boletos del aficionado autenticado (GET /me/tickets).
export class MyTicketQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El partido debe ser un número entero' })
  @Min(1, { message: 'El identificador del partido no es válido' })
  matchId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'La localidad debe ser un número entero' })
  @Min(1, { message: 'El identificador de la localidad no es válido' })
  locationId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;
}

