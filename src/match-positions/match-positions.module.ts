import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchPosition } from './entities/match-position.entity';
import { MatchesModule } from '../matches/matches.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { MatchPositionsController } from './match-positions.controller';
import { MatchPositionsService } from './match-positions.service';
import { MatchPositionsRepository } from './repositories/match-positions.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchPosition]),
    MatchesModule,
    TeamPlayersModule,
  ],
  controllers: [MatchPositionsController],
  providers: [MatchPositionsService, MatchPositionsRepository],
})
export class MatchPositionsModule {}
