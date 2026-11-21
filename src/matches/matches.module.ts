import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Phase } from '../phases/entities/phase.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { MatchPosition } from '../match-positions/entities/match-position.entity';
import { Goal } from '../goals/entities/goal.entity';
import { TeamsModule } from '../teams/teams.module';
import { VenuesModule } from '../venues/venues.module';
import { BallsModule } from '../balls/balls.module';
import { TournamentVenuesModule } from '../tournament-venues/tournament-venues.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BetSettlementModule } from '../bets/bet-settlement.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchesRepository } from './repositories/matches.repository';
import { MatchNotifier } from './match-notifier';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Phase, Registration, MatchPosition, Goal]),
    TeamsModule,
    VenuesModule,
    BallsModule,
    TournamentVenuesModule,
    NotificationsModule,
    BetSettlementModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesRepository, MatchNotifier],
  // Lo usan los módulos de Fercho (getMatchOrFail y MatchNotifier).
  exports: [MatchesService, MatchNotifier],
})
export class MatchesModule {}
