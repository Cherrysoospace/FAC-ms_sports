import { ChildEntity, Column, OneToMany, Unique } from 'typeorm';
import { Phase } from './phase.entity';
import { Team } from '../../teams/entities/team.entity';

/**
 * Grupo es subclase de Fase (diagrama de clases).
 *
 * Cada registro es UN grupo concreto (A, B, C...). La "fase de grupos" de un
 * torneo es el conjunto de grupos que comparten tournament + phase_order, y
 * esos grupos deben compartir también startDate y endDate (lo valida el servicio).
 *
 * Grupo 1 — n Equipo (diagrama): la llave foránea group_id vive en teams.
 */
@ChildEntity('GROUP')
@Unique('UQ_phases_tournament_order_group', ['tournament', 'order', 'groupName'])
export class GroupPhase extends Phase {
  @Column({ name: 'group_name', type: 'varchar', length: 10 })
  groupName!: string;

  @Column({ name: 'qualifiers_count', type: 'int', nullable: true })
  qualifiersCount?: number;

  @OneToMany(() => Team, (team) => team.group, { cascade: false })
  teams?: Team[];
}
