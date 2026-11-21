import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CountRow,
  escapeLike,
  toCountMap,
} from '../../common/database/query.util';
import { PaymentMethod } from '../entities/payment-method.entity';
import { FanPaymentMethod } from '../entities/fan-payment-method.entity';
import { PaymentMethodType } from '../enums/payment-method-type.enum';

export interface PaymentMethodFilters {
  type?: PaymentMethodType;
  active?: boolean;
  search?: string;
}

/**
 * Consultas SQL del catálogo de métodos de pago sin N+1.
 */
@Injectable()
export class PaymentMethodsRepository {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(FanPaymentMethod)
    private readonly fanPaymentMethodRepository: Repository<FanPaymentMethod>,
  ) {}

  findByFilters(filters: PaymentMethodFilters): Promise<PaymentMethod[]> {
    const qb = this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .orderBy('paymentMethod.name', 'ASC')
      .addOrderBy('paymentMethod.id', 'ASC');

    if (filters.type !== undefined) {
      qb.andWhere('paymentMethod.type = :type', { type: filters.type });
    }
    if (filters.active !== undefined) {
      qb.andWhere('paymentMethod.active = :active', { active: filters.active });
    }
    if (filters.search) {
      const term = `%${escapeLike(filters.search.trim().toLowerCase())}%`;
      qb.andWhere(
        "(LOWER(paymentMethod.name) LIKE :term ESCAPE '\\\\' " +
          "OR LOWER(COALESCE(paymentMethod.description, '')) LIKE :term ESCAPE '\\\\')",
        { term },
      );
    }

    return qb.getMany();
  }

  findByNameIgnoringCase(
    name: string,
    excludeId?: number,
  ): Promise<PaymentMethod | null> {
    const qb = this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .where('LOWER(paymentMethod.name) = LOWER(:name)', { name });

    if (excludeId !== undefined) {
      qb.andWhere('paymentMethod.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  countFanPaymentMethods(paymentMethodId: number): Promise<number> {
    return this.fanPaymentMethodRepository.count({
      where: { paymentMethod: { id: paymentMethodId } },
    });
  }

  async countFanPaymentMethodsByIds(
    ids: number[],
  ): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();

    const rows = await this.fanPaymentMethodRepository
      .createQueryBuilder('fpm')
      .select('fpm.payment_method_id', 'id')
      .addSelect('COUNT(fpm.id)', 'total')
      .where('fpm.payment_method_id IN (:...ids)', { ids })
      .groupBy('fpm.payment_method_id')
      .getRawMany<CountRow>();

    return toCountMap(rows);
  }
}

