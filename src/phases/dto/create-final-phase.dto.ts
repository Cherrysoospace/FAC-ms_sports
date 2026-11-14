import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FinalRound } from '../enums/final-round.enum';
import { IsDateOnly, TrimSpaces } from '../../common/validation';

export const FINAL_ROUND_MESSAGE = `La ronda debe ser una de: ${Object.values(FinalRound).join(', ')}`;

export class CreateFinalPhaseDto {
  @Type(() => Number)
  @IsInt({ message: 'El torneo debe ser un número entero' })
  @Min(1, { message: 'El identificador del torneo no es válido' })
  tournamentId!: number;

  @TrimSpaces()
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
  @IsDateOnly('La fecha de inicio debe tener el formato YYYY-MM-DD')
  @IsDateString(
    { strict: true },
    { message: 'La fecha de inicio no es una fecha válida' },
  )
  startDate?: string | null;

  @IsOptional()
  @IsDateOnly('La fecha de fin debe tener el formato YYYY-MM-DD')
  @IsDateString(
    { strict: true },
    { message: 'La fecha de fin no es una fecha válida' },
  )
  endDate?: string | null;
}
