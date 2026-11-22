import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { Match } from '../matches/entities/match.entity';
import { TeamPlayer } from '../team-players/entities/team-player.entity';
import { FanTeam } from '../fans/entities/fan-team.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamsRepository } from './repositories/teams.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      TeamSport,
      Registration,
      Match,
      TeamPlayer,
      FanTeam,
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  // Lo usan otros módulos (getTeamOrFail).
  exports: [TeamsService],
})
export class TeamsModule {}
