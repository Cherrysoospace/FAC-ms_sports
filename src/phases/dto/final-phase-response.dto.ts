import { FinalRound } from '../enums/final-round.enum';
import { PhaseTournamentDto } from './phase-tournament.dto';

export class FinalPhaseResponseDto {
  id!: number;
  name!: string;
  order!: number;
  round!: FinalRound;
  startDate!: string | null;
  endDate!: string | null;
  tournament!: PhaseTournamentDto;
  matchesCount!: number;
}
