export class BallResponseDto {
  id!: number;
  brand!: string;
  model!: string;
  size!: string | null;
  active!: boolean;
  // Partido al que está asignada; null = libre
  matchId!: number | null;
}
