import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';
import { NotNullIfPresent } from '../../common/validation';
import { BetSelection } from '../enums/bet-selection.enum';
import { BET_SELECTION_MESSAGE } from './place-bet.dto';

/**
 * Actualización parcial de una apuesta pendiente antes de iniciar el partido.
 * No permite cambiar partido ni la cuota fija almacenada al registrar (HU-GC-11).
 */
export class UpdateMyBetDto {
  @Type(() => Number)
  @NotNullIfPresent()
  @Min(1, { message: 'El identificador del método de pago no es válido' })
  @IsInt({ message: 'El método de pago debe ser un número entero' })
  fanPaymentMethodId?: number;

  @NotNullIfPresent()
  @IsEnum(BetSelection, { message: BET_SELECTION_MESSAGE })
  selection?: BetSelection;

  @Type(() => Number)
  @NotNullIfPresent()
  @Max(100000000, {
    message: 'El valor de la apuesta supera el máximo permitido',
  })
  @Min(1, { message: 'El valor de la apuesta debe ser al menos 1' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El valor de la apuesta debe ser un número válido' },
  )
  amount?: number;
}

