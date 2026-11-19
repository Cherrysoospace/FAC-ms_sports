import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Player } from '../../players/entities/player.entity';
import { ContractStatus } from '../enums/contract-status.enum';
import { ReleaseReason } from '../enums/release-reason.enum';

/**
 * Equipo n — n Jugador (clase asociativa "Equipo Jugador" del diagrama).
 * No lleva unique (equipo, jugador): un jugador puede volver al mismo equipo
 * en otro periodo. Al retirarlo la fila no se borra: queda RELEASED como
 * historial de traspasos. Los periodos no se cruzan (TeamPlayersService).
 */
@Entity('team_players')
@Index('IDX_team_players_team_player', ['team', 'player'])
export class TeamPlayer {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Team, (team) => team.teamPlayers, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => Player, (player) => player.teamPlayers, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  // Fechas de día 'YYYY-MM-DD' del contrato
  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  status!: ContractStatus;

  // Solo cuando status = RELEASED
  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate!: string | null;

  @Column({
    name: 'release_reason',
    type: 'enum',
    enum: ReleaseReason,
    nullable: true,
  })
  releaseReason!: ReleaseReason | null;
}
