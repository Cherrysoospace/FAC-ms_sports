import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';
import { BetSelection } from '../enums/bet-selection.enum';

export const BET_SELECTION_MESSAGE = `La selección debe ser una de: ${Object.values(BetSelection).join(', ')}`;

// Registro de apuesta del aficionado autenticado (POST /me/bets).
export class PlaceBetDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del partido no es válido' })
  @IsInt({ message: 'El partido es obligatorio y debe ser un número entero' })
  matchId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del método de pago no es válido' })
  @IsInt({
    message: 'El método de pago es obligatorio y debe ser un número entero',
  })
  fanPaymentMethodId!: number;

  @IsEnum(BetSelection, { message: BET_SELECTION_MESSAGE })
  selection!: BetSelection;

  @Type(() => Number)
  @Max(100000000, {
    message: 'El valor de la apuesta supera el máximo permitido',
  })
  @Min(1, { message: 'El valor de la apuesta debe ser al menos 1' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El valor de la apuesta debe ser un número válido' },
  )
  amount!: number;

  @Type(() => Number)
  @Max(100, { message: 'La cuota no puede superar 100.00' })
  @Min(1.01, { message: 'La cuota debe ser mayor a 1.00 (mínimo 1.01)' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La cuota debe ser un número válido' },
  )
  odds!: number;
}
