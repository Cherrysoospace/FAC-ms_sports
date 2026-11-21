import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { PaymentMethod } from '../entities/payment-method.entity';
import { CreatePaymentMethodDto } from '../dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dto/update-payment-method.dto';
import { PaymentMethodResponseDto } from '../dto/payment-method-response.dto';

@Injectable()
export class PaymentMethodMapper extends BaseMapper<
  PaymentMethod,
  PaymentMethodResponseDto
> {
  toDto(entity: PaymentMethod): PaymentMethodResponseDto {
    return this.toDtoWithCount(entity, 0);
  }

  toDtoWithCount(
    entity: PaymentMethod,
    fanPaymentMethodsCount: number,
  ): PaymentMethodResponseDto {
    const dto = new PaymentMethodResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.description = entity.description ?? null;
    dto.active = entity.active;
    dto.fanPaymentMethodsCount = fanPaymentMethodsCount;
    return dto;
  }

  toDtoListWithCounts(
    entities: readonly PaymentMethod[],
    counts: ReadonlyMap<number, number>,
  ): PaymentMethodResponseDto[] {
    return entities.map((pm) => this.toDtoWithCount(pm, counts.get(pm.id) ?? 0));
  }

  toEntity(dto: CreatePaymentMethodDto): PaymentMethod {
    const entity = new PaymentMethod();
    entity.name = dto.name;
    entity.type = dto.type;
    entity.description = dto.description ? dto.description : null;
    entity.active = true;
    return entity;
  }

  mergeEntity(
    entity: PaymentMethod,
    dto: UpdatePaymentMethodDto,
  ): PaymentMethod {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.description !== undefined) {
      entity.description = dto.description ? dto.description : null;
    }
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }
}

