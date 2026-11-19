import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamPlayer } from './entities/team-player.entity';
import { TeamsModule } from '../teams/teams.module';
import { PlayersModule } from '../players/players.module';
import { TeamPlayersController } from './team-players.controller';
import { TeamPlayersService } from './team-players.service';
import { TeamPlayersRepository } from './repositories/team-players.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TeamPlayer]), TeamsModule, PlayersModule],
  controllers: [TeamPlayersController],
  providers: [TeamPlayersService, TeamPlayersRepository],
  // Lo usa el perfil del jugador (findAll por jugador).
  exports: [TeamPlayersService],
})
export class TeamPlayersModule {}
