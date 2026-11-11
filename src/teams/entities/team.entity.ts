import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TeamModality } from '../enums/team-modality.enum';
import { TeamSport } from '../../team-sports/entities/team-sport.entity';
import { Registration } from '../../registrations/entities/registration.entity';
// Import solo de tipo: un import real crea un ciclo (phase → match → team →
// group-phase) en el que `GroupPhase extends Phase` se evalúa con Phase aún
// sin definir. Por eso la relación usa el nombre de la entidad como string.
import type { GroupPhase } from '../../phases/entities/group-phase.entity';
import { Match } from '../../matches/entities/match.entity';

@Entity('teams')
@Unique('UQ_teams_name_modality', ['name', 'modality'])
export class Team {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'city', type: 'varchar', length: 80 })
  city!: string;

  @Column({ name: 'modality', type: 'enum', enum: TeamModality })
  modality!: TeamModality;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  @OneToMany(() => TeamSport, (teamSport) => teamSport.team, { cascade: false })
  teamSports?: TeamSport[];

  @OneToMany(() => Registration, (registration) => registration.team, {
    cascade: false,
  })
  registrations?: Registration[];

  @ManyToMany('GroupPhase', (group: GroupPhase) => group.teams)
  groups?: GroupPhase[];

  @OneToMany(() => Match, (match) => match.homeTeam, { cascade: false })
  homeMatches?: Match[];

  @OneToMany(() => Match, (match) => match.awayTeam, { cascade: false })
  awayMatches?: Match[];
}
