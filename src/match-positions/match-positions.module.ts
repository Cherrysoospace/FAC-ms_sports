import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchPosition } from './entities/match-position.entity';
import { MatchesModule } from '../matches/matches.module';
import { TeamPlayersModule } from '../team-players/team-players.module';
import { MatchPositionsController } from './match-positions.controller';
import { MatchPositionsService } from './match-positions.service';
import { MatchPositionsRepository } from './repositories/match-positions.repository';
import { PositionSimulator } from './simulation/position-simulator';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchPosition]),
    MatchesModule,
    TeamPlayersModule,
  ],
  controllers: [MatchPositionsController],
  // PositionSimulator solo actúa con SIMULATE_POSITIONS=true (desarrollo/demo)
  providers: [
    MatchPositionsService,
    MatchPositionsRepository,
    PositionSimulator,
  ],
})
export class MatchPositionsModule {}
