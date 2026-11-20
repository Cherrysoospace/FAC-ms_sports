import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Player } from '../../players/entities/player.entity';
import { Ball } from '../../balls/entities/ball.entity';
import { decimalTransformer } from '../../common/database/decimal.transformer';

/**
 * Posición espacial del diagrama: Jugador 1 — n Posición y Pelota 1 — n
 * Posición, siempre de un partido. Cada fila es de un jugador o de la pelota
 * (nunca de ambos). No se actualiza: cada registro nuevo es una fila, así se
 * conserva el seguimiento completo del partido.
 * Coordenadas en porcentaje del campo: x de 0 (arco local) a 100; y de 0 a 100.
 */
@Entity('match_positions')
@Index('IDX_match_positions_match_recorded', ['match', 'recordedAt'])
@Check(
  'CHK_match_positions_player_or_ball',
  '(`player_id` IS NULL) <> (`ball_id` IS NULL)',
)
export class MatchPosition {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Match, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @ManyToOne(() => Player, (player) => player.positions, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'player_id' })
  player!: Player | null;

  @ManyToOne(() => Ball, (ball) => ball.positions, {
    cascade: false,
    nullable: true,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'ball_id' })
  ball!: Ball | null;

  @Column({
    name: 'x',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  x!: number;

  @Column({
    name: 'y',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  y!: number;

  // Con milisegundos (el simulador manda cada 1–2 s). La misma para toda la "foto".
  @Column({ name: 'recorded_at', type: 'datetime', precision: 3 })
  recordedAt!: Date;
}
