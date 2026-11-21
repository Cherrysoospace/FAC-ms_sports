import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Player } from '../../players/entities/player.entity';

/**
 * Anotación del diagrama (HU-GC-07): Partido 1 — n Anotación (R21) y
 * Jugador 1 — n Anotación (R22). Registra los goles o puntos anotados por
 * un jugador participante en un partido sin cascadas en el borrado.
 */
@Entity('goals')
@Index('IDX_goals_match_minute', ['match', 'minute'])
@Index('IDX_goals_player', ['player'])
@Check('CHK_goals_minute_non_negative', '`minute` >= 0')
@Check('CHK_goals_points_positive', '`points` >= 1')
export class Goal {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Match, (match) => match.goals, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @ManyToOne(() => Player, (player) => player.goals, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  @Column({ name: 'minute', type: 'smallint' })
  minute!: number;

  @Column({ name: 'points', type: 'smallint', default: 1 })
  points!: number;

  @Column({ name: 'description', type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'recorded_at', type: 'datetime' })
  recordedAt!: Date;
}
