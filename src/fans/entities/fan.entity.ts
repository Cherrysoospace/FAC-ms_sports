import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FanTeam } from './fan-team.entity';
import { FanPaymentMethod } from '../../payment-methods/entities/fan-payment-method.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

/**
 * Aficionado del diagrama de clases. Se vincula uno a uno con el usuario
 * autenticado en ms_security mediante `securityUserId` (claim `sub` del JWT).
 */
@Entity('fans')
@Unique('UQ_fans_security_user_id', ['securityUserId'])
@Unique('UQ_fans_document_number', ['documentNumber'])
@Unique('UQ_fans_email', ['email'])
export class Fan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'security_user_id', type: 'int' })
  securityUserId!: number;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 20 })
  documentNumber!: string;

  @Column({ name: 'email', type: 'varchar', length: 150 })
  email!: string;

  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  // Aficionado n — n Equipo (clase de asociación Aficionado-Equipo, R18)
  @OneToMany(() => FanTeam, (fanTeam) => fanTeam.fan, { cascade: false })
  favoriteTeams?: FanTeam[];

  // Aficionado n — n Método de pago (clase intermedia MétodoPago-Aficionado, R25)
  @OneToMany(() => FanPaymentMethod, (fpm) => fpm.fan, { cascade: false })
  paymentMethods?: FanPaymentMethod[];

  // Partido n — n Aficionado mediante Boleto (diagrama, R16)
  @OneToMany(() => Ticket, (ticket) => ticket.fan, { cascade: false })
  tickets?: Ticket[];
}
