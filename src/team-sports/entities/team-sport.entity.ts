import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Sport } from '../../sports/entities/sport.entity';

@Entity('team_sports')
@Unique('UQ_team_sports_team_sport', ['team', 'sport'])
export class TeamSport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Team, (team) => team.teamSports, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => Sport, (sport) => sport.teamSports, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'sport_id' })
  sport!: Sport;
}
