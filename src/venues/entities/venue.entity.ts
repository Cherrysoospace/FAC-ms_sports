import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TournamentVenue } from '../../tournament-venues/entities/tournament-venue.entity';
import { Match } from '../../matches/entities/match.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'address', type: 'varchar', length: 200, nullable: true })
  address?: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  // Un complejo deportivo contiene espacios (canchas, coliseos...)
  @ManyToOne(() => Venue, (venue) => venue.children, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Venue;

  @OneToMany(() => Venue, (venue) => venue.parent, { cascade: false })
  children?: Venue[];

  @OneToMany(
    () => TournamentVenue,
    (tournamentVenue) => tournamentVenue.venue,
    { cascade: false },
  )
  tournamentVenues?: TournamentVenue[];

  @OneToMany(() => Match, (match) => match.venue, { cascade: false })
  matches?: Match[];

  // Escenario 1 — n Localidad (la llave venue_id está en locations)
  @OneToMany(() => Location, (location) => location.venue, { cascade: false })
  locations?: Location[];
}
