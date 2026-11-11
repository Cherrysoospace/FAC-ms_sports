import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';

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

  @OneToMany(() => Match, (match) => match.ball, { cascade: false })
  matches?: Match[];
}
