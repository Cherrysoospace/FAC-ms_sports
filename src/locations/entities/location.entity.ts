import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

/**
 * Localidad de un escenario (Norte, Sur, General, VIP...).
 * Diagrama: Escenario 1 — n Localidad. Más adelante, Localidad 1 — n Boleto
 * (módulo de Fercho).
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
}
