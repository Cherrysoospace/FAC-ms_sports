import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { PlayerSkillsModule } from '../player-skills/player-skills.module';
import { PlayerProfilesController } from './player-profiles.controller';
import { PlayerProfilesService } from './player-profiles.service';

@Module({
  imports: [PlayersModule, TeamPlayersModule, PlayerSkillsModule],
  controllers: [PlayerProfilesController],
  providers: [PlayerProfilesService],
})
export class PlayerProfilesModule {}
