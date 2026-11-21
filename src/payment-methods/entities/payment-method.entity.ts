import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PaymentMethodType } from '../enums/payment-method-type.enum';
import { FanPaymentMethod } from './fan-payment-method.entity';

/**
 * Catálogo de métodos de pago disponibles en la plataforma (HU-GC-10).
 */
@Entity('payment_methods')
@Unique('UQ_payment_methods_name', ['name'])
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'type', type: 'enum', enum: PaymentMethodType })
  type!: PaymentMethodType;

  @Column({ name: 'description', type: 'varchar', length: 250, nullable: true })
  description!: string | null;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @OneToMany(() => FanPaymentMethod, (fpm) => fpm.paymentMethod, {
    cascade: false,
  })
  fanPaymentMethods?: FanPaymentMethod[];
}
