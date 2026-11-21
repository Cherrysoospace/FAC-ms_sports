import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Fan } from '../../fans/entities/fan.entity';
import { PaymentMethod } from './payment-method.entity';

/**
 * Aficionado n — n Método de pago mediante MétodoPago-Aficionado (R25 del diagrama).
 * Entidad intermedia con llave primaria simple y unicidad por (fan, paymentMethod, reference).
 */
@Entity('fan_payment_methods')
@Unique('UQ_fan_payment_methods_fan_method_ref', [
  'fan',
  'paymentMethod',
  'reference',
])
@Index('IDX_fan_payment_methods_fan', ['fan'])
@Index('IDX_fan_payment_methods_method', ['paymentMethod'])
export class FanPaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Fan, (fan) => fan.paymentMethods, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'fan_id' })
  fan!: Fan;

  @ManyToOne(() => PaymentMethod, (pm) => pm.fanPaymentMethods, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'alias', type: 'varchar', length: 80 })
  alias!: string;

  @Column({ name: 'reference', type: 'varchar', length: 100 })
  reference!: string;

  @Column({ name: 'details', type: 'json' })
  details!: Record<string, unknown>;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}
