import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Phase } from '../../phases/entities/phase.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { Team } from '../../teams/entities/team.entity';
import { Ball } from '../../balls/entities/ball.entity';
import { Goal } from '../../goals/entities/goal.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Bet } from '../../bets/entities/bet.entity';
import { MatchStatus } from '../enums/match-status.enum';

@Entity('matches')
@Check('CHK_matches_different_teams', '`home_team_id` <> `away_team_id`')
export class Match {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt!: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.SCHEDULED,
  })
  status!: MatchStatus;

  @Column({ name: 'home_score', type: 'int', nullable: true })
  homeScore?: number;

  @Column({ name: 'away_score', type: 'int', nullable: true })
  awayScore?: number;

  @Column({ name: 'betting_open', type: 'boolean', default: true })
  bettingOpen!: boolean;

  @ManyToOne(() => Phase, (phase) => phase.matches, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'phase_id' })
  phase!: Phase;

  // Escenario 1 — n Partido (diagrama): todo partido tiene exactamente un escenario.
  @ManyToOne(() => Venue, (venue) => venue.matches, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue;

  @ManyToOne(() => Team, (team) => team.homeMatches, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'home_team_id' })
  homeTeam!: Team;

  @ManyToOne(() => Team, (team) => team.awayMatches, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'away_team_id' })
  awayTeam!: Team;

  // Partido 1 — 1 Pelota (diagrama): pelota obligatoria y única por partido (índice único en ball_id).
  @OneToOne(() => Ball, (ball) => ball.match, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'ball_id' })
  ball!: Ball;

  // Partido 1 — n Anotación (diagrama, R21)
  @OneToMany(() => Goal, (goal) => goal.match, { cascade: false })
  goals?: Goal[];

  // Partido n — n Aficionado mediante Boleto (diagrama, R16)
  @OneToMany(() => Ticket, (ticket) => ticket.match, { cascade: false })
  tickets?: Ticket[];

  // Partido n — n Aficionado mediante Apuesta (diagrama, R17)
  @OneToMany(() => Bet, (bet) => bet.match, { cascade: false })
  bets?: Bet[];
}
