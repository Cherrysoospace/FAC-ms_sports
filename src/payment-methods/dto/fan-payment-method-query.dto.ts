import { IsBoolean, IsOptional } from 'class-validator';
import { ToBoolean } from '../../common/validation';

export class FanPaymentMethodQueryDto {
  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
