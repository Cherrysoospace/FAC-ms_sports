import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('tournament_venues')
@Unique('UQ_tournament_venues_tournament_venue', ['tournament', 'venue'])
export class TournamentVenue {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.tournamentVenues, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @ManyToOne(() => Venue, (venue) => venue.tournamentVenues, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;
}
