import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { Fan } from '../../fans/entities/fan.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { FanPaymentMethod } from '../entities/fan-payment-method.entity';
import { RegisterFanPaymentMethodDto } from '../dto/register-fan-payment-method.dto';
import { UpdateFanPaymentMethodDto } from '../dto/update-fan-payment-method.dto';
import {
  FanPaymentMethodCatalogDto,
  FanPaymentMethodResponseDto,
} from '../dto/fan-payment-method-response.dto';

@Injectable()
export class FanPaymentMethodMapper extends BaseMapper<
  FanPaymentMethod,
  FanPaymentMethodResponseDto
> {
  toDto(entity: FanPaymentMethod): FanPaymentMethodResponseDto {
    const catalog = new FanPaymentMethodCatalogDto();
    catalog.id = entity.paymentMethod.id;
    catalog.name = entity.paymentMethod.name;
    catalog.type = entity.paymentMethod.type;
    catalog.active = entity.paymentMethod.active;

    const dto = new FanPaymentMethodResponseDto();
    dto.id = entity.id;
    dto.alias = entity.alias;
    dto.reference = entity.reference;
    dto.details = entity.details;
    dto.active = entity.active;
    dto.createdAt = entity.createdAt;
    dto.fanId = entity.fan.id;
    dto.paymentMethod = catalog;
    return dto;
  }

  toEntity(
    fan: Fan,
    paymentMethod: PaymentMethod,
    dto: RegisterFanPaymentMethodDto,
  ): FanPaymentMethod {
    const entity = new FanPaymentMethod();
    entity.fan = fan;
    entity.paymentMethod = paymentMethod;
    entity.alias = dto.alias;
    entity.reference = dto.reference;
    entity.details = dto.details;
    entity.active = true;
    return entity;
  }

  mergeEntity(
    entity: FanPaymentMethod,
    dto: UpdateFanPaymentMethodDto,
  ): FanPaymentMethod {
    if (dto.alias !== undefined) entity.alias = dto.alias;
    if (dto.reference !== undefined) entity.reference = dto.reference;
    if (dto.details !== undefined) entity.details = dto.details;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }
}
