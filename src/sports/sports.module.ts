import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport } from './entities/sport.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';
import { SportsRepository } from './repositories/sports.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sport, Tournament, TeamSport])],
  controllers: [SportsController],
  providers: [SportsService, SportsRepository],
})
export class SportsModule {}
