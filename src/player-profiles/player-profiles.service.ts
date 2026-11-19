import { Injectable } from '@nestjs/common';
import { PlayersService } from '../players/players.service';
import { TeamPlayersService } from '../team-players/team-players.service';
import { PlayerSkillsService } from '../player-skills/player-skills.service';
import { ContractStage } from '../team-players/enums/contract-stage.enum';
import { PlayerProfileResponseDto } from './dto/player-profile-response.dto';

// Arma el perfil con los servicios de cada módulo; no tiene consultas propias.
@Injectable()
export class PlayerProfilesService {
  constructor(
    private readonly playersService: PlayersService,
    private readonly teamPlayersService: TeamPlayersService,
    private readonly playerSkillsService: PlayerSkillsService,
  ) {}

  async getProfile(playerId: number): Promise<PlayerProfileResponseDto> {
    const player = await this.playersService.findOne(playerId);
    const [contracts, skills] = await Promise.all([
      this.teamPlayersService.findAll({ playerId }),
      this.playerSkillsService.findAll({ playerId }),
    ]);

    const profile = new PlayerProfileResponseDto();
    profile.player = player;
    const byStage = (stage: ContractStage) =>
      contracts.filter((c) => c.stage === stage);
    profile.currentTeams = byStage(ContractStage.CURRENT);
    profile.upcomingTeams = byStage(ContractStage.UPCOMING);
    profile.teamHistory = byStage(ContractStage.PAST);
    profile.skills = skills;
    return profile;
  }
}
