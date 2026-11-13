import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { FinalRound } from '../enums/final-round.enum';
import { DATE_ONLY_REGEX } from '../../tournaments/dto/create-tournament.dto';

export const FINAL_ROUND_MESSAGE = `La ronda debe ser una de: ${Object.values(FinalRound).join(', ')}`;

export class CreateFinalPhaseDto {
  @Type(() => Number)
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId!: number;

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

  @IsEnum(FinalRound, { message: FINAL_ROUND_MESSAGE })
  round!: FinalRound;

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
