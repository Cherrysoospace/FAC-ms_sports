import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

/**
 * Localidad de un escenario (Norte, Sur, General, VIP...).
 * Diagrama: Escenario 1 — n Localidad y Localidad 1 — n Boleto (R15).
 */
@Entity('locations')
@Unique('UQ_locations_venue_name', ['venue', 'name'])
export class Location {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 60 })
  name!: string;

  @Column({ name: 'capacity', type: 'int' })
  capacity!: number;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @ManyToOne(() => Venue, (venue) => venue.locations, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;

  // Localidad 1 — n Boleto (diagrama, R15)
  @OneToMany(() => Ticket, (ticket) => ticket.location, { cascade: false })
  tickets?: Ticket[];
}
