import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { MatchPosition } from '../../match-positions/entities/match-position.entity';

@Entity('balls')
export class Ball {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'brand', type: 'varchar', length: 80 })
  brand!: string;

  @Column({ name: 'model', type: 'varchar', length: 80 })
  model!: string;

  @Column({ name: 'size', type: 'varchar', length: 20, nullable: true })
  size?: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  // Partido 1 — 1 Pelota (diagrama). El lado dueño (ball_id) está en matches.
  @OneToOne(() => Match, (match) => match.ball)
  match?: Match | null;

  // Pelota 1 — n Posición espacial (diagrama)
  @OneToMany(() => MatchPosition, (position) => position.ball, {
    cascade: false,
  })
  positions?: MatchPosition[];
}
