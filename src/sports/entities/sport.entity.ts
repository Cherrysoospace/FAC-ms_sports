import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';

@Entity('sports')
export class Sport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @ManyToOne(() => Sport, (sport) => sport.subSports, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Sport;

  @OneToMany(() => Sport, (sport) => sport.parent, { cascade: false })
  subSports?: Sport[];

  @OneToMany(() => Tournament, (tournament) => tournament.sport, {
    cascade: false,
  })
  tournaments?: Tournament[];

  @OneToMany(() => TeamSport, (teamSport) => teamSport.sport, {
    cascade: false,
  })
  teamSports?: TeamSport[];
}
