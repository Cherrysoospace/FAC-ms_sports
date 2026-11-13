import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DATE_ONLY_REGEX } from '../../tournaments/dto/create-tournament.dto';

export class CreateGroupPhaseDto {
  @Type(() => Number)
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId!: number;

  // Nombre de la fase, compartido por todos sus grupos (ej. 'Fase de grupos')
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name!: string;

  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(1, { message: 'El orden debe ser mayor o igual a 1' })
  order!: number;

  // Letra o nombre corto del grupo (ej. 'A'), se guarda en mayúsculas
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty({ message: 'El nombre del grupo es obligatorio' })
  @IsString({ message: 'El nombre del grupo debe ser texto' })
  @MaxLength(10, {
    message: 'El nombre del grupo no puede superar los 10 caracteres',
  })
  groupName!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'Los clasificados deben ser un número entero' })
  @Min(1, { message: 'Debe clasificar al menos 1 equipo' })
  qualifiersCount?: number | null;

  @IsOptional()
  @Matches(DATE_ONLY_REGEX, {
    message: 'La fecha de inicio debe tener el formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'La fecha de inicio no es una fecha válida' },
  )
  startDate?: string | null;

  @IsOptional()
  @Matches(DATE_ONLY_REGEX, {
    message: 'La fecha de fin debe tener el formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'La fecha de fin no es una fecha válida' },
  )
  endDate?: string | null;
}
