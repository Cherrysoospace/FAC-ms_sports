import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TeamPlayer } from '../../team-players/entities/team-player.entity';
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

  // Grupo 1 — n Equipo (diagrama). Un equipo pertenece como máximo a un grupo
  // a la vez; al retirarlo del grupo se deja en null.
  @ManyToOne('GroupPhase', (group: GroupPhase) => group.teams, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'group_id' })
  group?: GroupPhase | null;

  @OneToMany(() => Match, (match) => match.homeTeam, { cascade: false })
  homeMatches?: Match[];

  @OneToMany(() => Match, (match) => match.awayTeam, { cascade: false })
  awayMatches?: Match[];

  // Equipo n — n Jugador (contratos vigentes y del historial)
  @OneToMany(() => TeamPlayer, (teamPlayer) => teamPlayer.team, {
    cascade: false,
  })
  teamPlayers?: TeamPlayer[];

  /**
   * Equipo n — n Equipo (autorrelación del diagrama, sin clase asociativa):
   * tabla pura team_relations. Es simétrica: A–B se guarda en ambos sentidos
   * para consultarla siempre desde team_id (TeamRelationsRepository).
   * Sin borrado en cascada (acuerdo del equipo): ambas FK son NO ACTION;
   * TypeORM toma la de related_team_id del lado inverso (relatedBy).
   */
  @ManyToMany(() => Team, (team) => team.relatedBy, {
    cascade: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinTable({
    name: 'team_relations',
    joinColumn: { name: 'team_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'related_team_id', referencedColumnName: 'id' },
  })
  relatedTeams?: Team[];

  // Lado inverso de relatedTeams; por la simetría contiene los mismos equipos.
  @ManyToMany(() => Team, (team) => team.relatedTeams, {
    cascade: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  relatedBy?: Team[];
}
