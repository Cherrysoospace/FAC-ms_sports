import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Bet } from '../../bets/entities/bet.entity';
import { FanPaymentMethod } from '../entities/fan-payment-method.entity';

export interface FanPaymentMethodFilters {
  fanId?: number;
  paymentMethodId?: number;
  active?: boolean;
}

/**
 * Consultas optimizadas de los métodos de pago registrados por cada aficionado (R25).
 */
@Injectable()
export class FanPaymentMethodsRepository {
  constructor(
    @InjectRepository(FanPaymentMethod)
    private readonly fanPaymentMethodRepository: Repository<FanPaymentMethod>,
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) {}

  private withRelations(): SelectQueryBuilder<FanPaymentMethod> {
    return this.fanPaymentMethodRepository
      .createQueryBuilder('fpm')
      .innerJoinAndSelect('fpm.fan', 'fan')
      .innerJoinAndSelect('fpm.paymentMethod', 'paymentMethod');
  }

  findByFilters(filters: FanPaymentMethodFilters): Promise<FanPaymentMethod[]> {
    const qb = this.withRelations()
      .orderBy('fpm.active', 'DESC')
      .addOrderBy('fpm.createdAt', 'DESC')
      .addOrderBy('fpm.id', 'DESC');

    if (filters.fanId !== undefined) {
      qb.andWhere('fan.id = :fanId', { fanId: filters.fanId });
    }
    if (filters.paymentMethodId !== undefined) {
      qb.andWhere('paymentMethod.id = :paymentMethodId', {
        paymentMethodId: filters.paymentMethodId,
      });
    }
    if (filters.active !== undefined) {
      qb.andWhere('fpm.active = :active', { active: filters.active });
    }

    return qb.getMany();
  }

  findOneWithRelations(id: number): Promise<FanPaymentMethod | null> {
    return this.withRelations().where('fpm.id = :id', { id }).getOne();
  }

  findDuplicate(
    fanId: number,
    paymentMethodId: number,
    reference: string,
    excludeId?: number,
  ): Promise<FanPaymentMethod | null> {
    const qb = this.fanPaymentMethodRepository
      .createQueryBuilder('fpm')
      .where('fpm.fan_id = :fanId', { fanId })
      .andWhere('fpm.payment_method_id = :paymentMethodId', { paymentMethodId })
      .andWhere('LOWER(fpm.reference) = LOWER(:reference)', { reference });

    if (excludeId !== undefined) {
      qb.andWhere('fpm.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  countByFanId(fanId: number): Promise<number> {
    return this.fanPaymentMethodRepository.count({
      where: { fan: { id: fanId } },
    });
  }

  countBets(fanPaymentMethodId: number): Promise<number> {
    return this.betRepository.count({
      where: { fanPaymentMethod: { id: fanPaymentMethodId } },
    });
  }
}

