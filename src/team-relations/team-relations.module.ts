import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/entities/team.entity';
import { TeamsModule } from '../teams/teams.module';
import { TeamRelationsController } from './team-relations.controller';
import { TeamRelationsService } from './team-relations.service';
import { TeamRelationsRepository } from './repositories/team-relations.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), TeamsModule],
  controllers: [TeamRelationsController],
  providers: [TeamRelationsService, TeamRelationsRepository],
})
export class TeamRelationsModule {}
