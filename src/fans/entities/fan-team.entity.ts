import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Fan } from './fan.entity';

/**
 * Aficionado n — n Equipo mediante Aficionado-Equipo (R18 del diagrama).
 * Entidad propia con PK simple y restricción única estricta sobre el par (fan, team).
 */
@Entity('fan_teams')
@Unique('UQ_fan_teams_fan_team', ['fan', 'team'])
@Index('IDX_fan_teams_team', ['team'])
export class FanTeam {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Fan, (fan) => fan.favoriteTeams, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'fan_id' })
  fan!: Fan;

  @ManyToOne(() => Team, (team) => team.fanTeams, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;
}

