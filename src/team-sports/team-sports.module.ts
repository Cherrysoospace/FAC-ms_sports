import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamSport } from './entities/team-sport.entity';
import { Sport } from '../sports/entities/sport.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { TeamsModule } from '../teams/teams.module';
import { TeamSportsController } from './team-sports.controller';
import { TeamSportsService } from './team-sports.service';
import { TeamSportsRepository } from './repositories/team-sports.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamSport, Sport, Registration]),
    TeamsModule,
  ],
  controllers: [TeamSportsController],
  providers: [TeamSportsService, TeamSportsRepository],
})
export class TeamSportsModule {}
