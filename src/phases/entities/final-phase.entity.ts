import { ChildEntity, Column, Unique } from 'typeorm';
import { Phase } from './phase.entity';
import { FinalRound } from '../enums/final-round.enum';

// Una sola fase por ronda eliminatoria (ej. una SEMI_FINAL) en cada torneo.
@ChildEntity('FINAL')
@Unique('UQ_phases_tournament_round', ['tournament', 'round'])
export class FinalPhase extends Phase {
  @Column({ name: 'round', type: 'enum', enum: FinalRound })
  round!: FinalRound;
}
