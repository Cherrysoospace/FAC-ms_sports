import { ChildEntity, Column, JoinTable, ManyToMany, Unique } from 'typeorm';
import { Phase } from './phase.entity';
import { Team } from '../../teams/entities/team.entity';

// Grupos paralelos (A, B...) comparten phase_order dentro de un torneo;
// lo que no se repite es el nombre del grupo en ese orden.
@ChildEntity('GROUP')
@Unique('UQ_phases_tournament_order_group', ['tournament', 'order', 'groupName'])
export class GroupPhase extends Phase {
  @Column({ name: 'group_name', type: 'varchar', length: 10 })
  groupName!: string;

  @Column({ name: 'qualifiers_count', type: 'int', nullable: true })
  qualifiersCount?: number;

  @ManyToMany(() => Team, (team) => team.groups)
  @JoinTable({
    name: 'group_teams',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams?: Team[];
}
