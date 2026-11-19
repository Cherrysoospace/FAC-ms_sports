import { PlayerResponseDto } from '../../players/dto/player-response.dto';
import { TeamPlayerResponseDto } from '../../team-players/dto/team-player-response.dto';
import { PlayerSkillResponseDto } from '../../player-skills/dto/player-skill-response.dto';

/**
 * Perfil deportivo del jugador (HU-GD-08). Las listas vacías significan
 * "sin equipos" / "sin habilidades"; los mensajes los muestra la vista.
 * Los contratos se separan con ContractPeriodPolicy.stageOf.
 */
export class PlayerProfileResponseDto {
  player!: PlayerResponseDto;
  // Vigentes hoy (CURRENT)
  currentTeams!: TeamPlayerResponseDto[];
  // Contratos firmados que aún no empiezan (UPCOMING)
  upcomingTeams!: TeamPlayerResponseDto[];
  // Retirados o vencidos (PAST), del más reciente al más antiguo
  teamHistory!: TeamPlayerResponseDto[];
  skills!: PlayerSkillResponseDto[];
}
