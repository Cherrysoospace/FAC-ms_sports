import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Team } from '../../teams/entities/team.entity';
import { RegistrationStatus } from '../enums/registration-status.enum';

@Entity('registrations')
@Unique('UQ_registrations_tournament_team', ['tournament', 'team'])
export class Registration {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.registrations, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @ManyToOne(() => Team, (team) => team.registrations, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @CreateDateColumn({ name: 'registered_at', type: 'datetime' })
  registeredAt!: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.ACTIVE,
  })
  status!: RegistrationStatus;

  @Column({ name: 'withdrawn_at', type: 'datetime', nullable: true })
  withdrawnAt?: Date;
}
