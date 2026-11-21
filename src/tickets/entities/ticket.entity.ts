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
import { Location } from '../../locations/entities/location.entity';

/**
 * Boleto del diagrama de clases (R15 Localidad 1—n Boleto, R16 Partido n—n Aficionado).
 * Lectura estricta UML: un único boleto por aficionado y partido (`match`, `fan`),
 * además de código único de boleto y borrado sin cascada.
 */
@Entity('tickets')
@Unique('UQ_tickets_code', ['code'])
@Unique('UQ_tickets_match_fan', ['match', 'fan'])
@Index('IDX_tickets_match_location', ['match', 'location'])
@Index('IDX_tickets_location_match', ['location', 'match'])
@Index('IDX_tickets_fan', ['fan'])
@Check('CHK_tickets_price_non_negative', '`price` >= 0')
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code!: string;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: '0.00',
  })
  price!: string;

  @CreateDateColumn({ name: 'purchased_at', type: 'datetime' })
  purchasedAt!: Date;

  @ManyToOne(() => Match, (match) => match.tickets, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @ManyToOne(() => Fan, (fan) => fan.tickets, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'fan_id' })
  fan!: Fan;

  @ManyToOne(() => Location, (location) => location.tickets, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'location_id' })
  location!: Location;
}

