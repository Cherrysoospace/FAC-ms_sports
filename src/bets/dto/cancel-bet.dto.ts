import { IsOptional, IsString, MaxLength } from 'class-validator';
import { TrimSpaces } from '../../common/validation';

// Motivo opcional al cancelar (aficionado) o anular (administrador) una apuesta.
export class CancelBetDto {
  @TrimSpaces()
  @IsOptional()
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  @IsString({ message: 'El motivo debe ser texto' })
  reason?: string;
}
