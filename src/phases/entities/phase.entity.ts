import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  TableInheritance,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { Match } from '../../matches/entities/match.entity';

@Entity('phases')
@TableInheritance({ column: { type: 'varchar', name: 'type', length: 20 } })
export abstract class Phase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  // "order" es palabra reservada en SQL, por eso la columna es phase_order
  @Column({ name: 'phase_order', type: 'int' })
  order!: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @ManyToOne(() => Tournament, (tournament) => tournament.phases, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'tournament_id' })
  tournament!: Tournament;

  @OneToMany(() => Match, (match) => match.phase, { cascade: false })
  matches?: Match[];
}
