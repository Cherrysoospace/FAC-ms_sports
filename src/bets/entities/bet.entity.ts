import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Fan } from '../../fans/entities/fan.entity';
import { FanPaymentMethod } from '../../payment-methods/entities/fan-payment-method.entity';
import { BetSelection } from '../enums/bet-selection.enum';
import { BetStatus } from '../enums/bet-status.enum';

/**
 * Apuesta del diagrama de clases (R17 Partido n—n Aficionado,
 * R26 MétodoPago-Aficionado 1—n Apuesta) según Anexo 3 (HU-GC-11).
 * Lectura estricta UML: una sola apuesta por aficionado y partido (`match`, `fan`),
 * cuota fija almacenada al registrar y borrado sin cascada.
 */
@Entity('bets')
@Unique('UQ_bets_match_fan', ['match', 'fan'])
@Index('IDX_bets_match_status', ['match', 'status'])
@Index('IDX_bets_fan_status', ['fan', 'status'])
@Index('IDX_bets_fan_payment_method', ['fanPaymentMethod'])
@Check('CHK_bets_amount_positive', '`amount` > 0')
@Check('CHK_bets_odds_gt_one', '`odds` > 1')
@Check('CHK_bets_payout_non_negative', '`payout` IS NULL OR `payout` >= 0')
export class Bet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'selection',
    type: 'enum',
    enum: BetSelection,
  })
  selection!: BetSelection;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount!: string;

  @Column({
    name: 'odds',
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  odds!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BetStatus,
    default: BetStatus.PENDING,
  })
  status!: BetStatus;

  @Column({
    name: 'payout',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  payout!: string | null;

  @CreateDateColumn({ name: 'placed_at', type: 'datetime' })
  placedAt!: Date;

  @Column({ name: 'settled_at', type: 'datetime', nullable: true })
  settledAt!: Date | null;

  @Column({
    name: 'settlement_note',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  settlementNote!: string | null;

  @ManyToOne(() => Match, (match) => match.bets, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @ManyToOne(() => Fan, (fan) => fan.bets, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'fan_id' })
  fan!: Fan;

  @ManyToOne(() => FanPaymentMethod, (fpm) => fpm.bets, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'fan_payment_method_id' })
  fanPaymentMethod!: FanPaymentMethod;
}
