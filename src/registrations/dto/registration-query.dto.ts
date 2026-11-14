import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { RegistrationStatus } from '../enums/registration-status.enum';

// Filtros de GET /registrations
export class RegistrationQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId?: number;

  // Torneos en los que está (o estuvo) inscrito un equipo
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'El equipo debe ser un número entero' })
  @Min(1, { message: 'El identificador del equipo no es válido' })
  teamId?: number;

  @IsOptional()
  @IsEnum(RegistrationStatus, {
    message: `El estado debe ser uno de: ${Object.values(RegistrationStatus).join(', ')}`,
  })
  status?: RegistrationStatus;
}
