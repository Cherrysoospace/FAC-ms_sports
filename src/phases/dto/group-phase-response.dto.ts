import { PhaseTournamentDto } from './phase-tournament.dto';

export class GroupPhaseResponseDto {
  id!: number;
  name!: string;
  order!: number;
  groupName!: string;
  qualifiersCount!: number | null;
  startDate!: string | null;
  endDate!: string | null;
  tournament!: PhaseTournamentDto;
  teamsCount!: number;
  matchesCount!: number;
}
