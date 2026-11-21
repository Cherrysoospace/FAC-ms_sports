import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from './entities/goal.entity';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { GoalsRepository } from './repositories/goals.repository';
import { GoalMapper } from './mappers/goal.mapper';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { TeamPlayersModule } from '../team-players/team-players.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal]),
    MatchesModule,
    PlayersModule,
    TeamPlayersModule,
  ],
  controllers: [GoalsController],
  providers: [GoalsService, GoalsRepository, GoalMapper],
  exports: [GoalsService, GoalsRepository],
})
export class GoalsModule {}
