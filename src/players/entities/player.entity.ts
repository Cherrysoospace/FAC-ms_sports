import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DominantFoot } from '../enums/dominant-foot.enum';
import { TeamPlayer } from '../../team-players/entities/team-player.entity';
import { PlayerSkill } from '../../player-skills/entities/player-skill.entity';
import { MatchPosition } from '../../match-positions/entities/match-position.entity';

@Entity('players')
@Unique('UQ_players_document_number', ['documentNumber'])
export class Player {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  // Normalizado sin puntos ni espacios (ver CreatePlayerDto): identificador único.
  @Column({ name: 'document_number', type: 'varchar', length: 20 })
  documentNumber!: string;

  // 'YYYY-MM-DD'. La edad no se guarda: se calcula (PlayerAgePolicy).
  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({ name: 'nationality', type: 'varchar', length: 60 })
  nationality!: string;

  // Texto libre: cada deporte tiene sus propias posiciones (DEL, base, líbero...).
  @Column({ name: 'position', type: 'varchar', length: 40 })
  position!: string;

  // Entero en centímetros: evita que MySQL devuelva un decimal como texto.
  @Column({ name: 'height_cm', type: 'smallint' })
  heightCm!: number;

  // Opcional: no aplica en todos los deportes.
  @Column({
    name: 'dominant_foot',
    type: 'enum',
    enum: DominantFoot,
    nullable: true,
  })
  dominantFoot!: DominantFoot | null;

  @Column({ name: 'active', type: 'boolean', default: true })
  active!: boolean;

  // Contratos con equipos (vigentes y del historial)
  @OneToMany(() => TeamPlayer, (teamPlayer) => teamPlayer.player, {
    cascade: false,
  })
  teamPlayers?: TeamPlayer[];

  @OneToMany(() => PlayerSkill, (playerSkill) => playerSkill.player, {
    cascade: false,
  })
  playerSkills?: PlayerSkill[];

  // Jugador 1 — n Posición espacial (diagrama)
  @OneToMany(() => MatchPosition, (position) => position.player, {
    cascade: false,
  })
  positions?: MatchPosition[];
}
