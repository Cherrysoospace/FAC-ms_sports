import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TrimSpaces } from '../../common/validation';

// Filtros administrativos de GET /tickets.
export class TicketQueryDto {
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

  @TrimSpaces()
  @IsOptional()
  @MaxLength(40, { message: 'El código no puede superar 40 caracteres' })
  @IsString({ message: 'El código debe ser texto' })
  code?: string;
}

