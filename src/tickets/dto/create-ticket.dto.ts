import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

// Emisión administrativa de boleto para un aficionado (POST /tickets).
export class CreateTicketDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del partido no es válido' })
  @IsInt({ message: 'El partido es obligatorio y debe ser un número entero' })
  matchId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador del aficionado no es válido' })
  @IsInt({
    message: 'El aficionado es obligatorio y debe ser un número entero',
  })
  fanId!: number;

  @Type(() => Number)
  @Min(1, { message: 'El identificador de la localidad no es válido' })
  @IsInt({
    message: 'La localidad es obligatoria y debe ser un número entero',
  })
  locationId!: number;

  @IsOptional()
  @Type(() => Number)
  @Max(99999999.99, {
    message: 'El precio del boleto supera el máximo permitido',
  })
  @Min(0, { message: 'El precio del boleto no puede ser negativo' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio del boleto debe ser un número válido' },
  )
  price?: number;
}
