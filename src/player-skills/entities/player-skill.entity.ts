import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Skill } from '../../skills/entities/skill.entity';

// Habilidad n — n Jugador (clase asociativa "Habilidad Jugador" del diagrama).
@Entity('player_skills')
@Unique('UQ_player_skills_player_skill', ['player', 'skill'])
export class PlayerSkill {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Player, (player) => player.playerSkills, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'player_id' })
  player!: Player;

  @ManyToOne(() => Skill, (skill) => skill.playerSkills, {
    cascade: false,
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'skill_id' })
  skill!: Skill;

  // Nivel del jugador en esa habilidad (1 a 100), para el radar del perfil.
  @Column({ name: 'level', type: 'tinyint', unsigned: true })
  level!: number;
}
