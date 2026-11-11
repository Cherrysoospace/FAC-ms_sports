import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Sport } from '../../sports/entities/sport.entity';
import { Phase } from '../../phases/entities/phase.entity';
import { TournamentStatus } from '../enums/tournament-status.enum';
import { Registration } from '../../registrations/entities/registration.entity';
import { TournamentVenue } from '../../tournament-venues/entities/tournament-venue.entity';

@Entity('tournaments')
@Unique('UQ_tournaments_name_sport', ['name', 'sport'])
export class Tournament {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'registration_opens_at', type: 'datetime' })
  registrationOpensAt!: Date;

  @Column({ name: 'registration_closes_at', type: 'datetime' })
  registrationClosesAt!: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.PLANNED,
  })
  status!: TournamentStatus;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @ManyToOne(() => Sport, (sport) => sport.tournaments, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'sport_id' })
  sport!: Sport;

  @OneToMany(() => Phase, (phase) => phase.tournament, { cascade: false })
  phases?: Phase[];

  @OneToMany(() => Registration, (registration) => registration.tournament, {
    cascade: false,
  })
  registrations?: Registration[];

  @OneToMany(
    () => TournamentVenue,
    (tournamentVenue) => tournamentVenue.tournament,
    { cascade: false },
  )
  tournamentVenues?: TournamentVenue[];
}
