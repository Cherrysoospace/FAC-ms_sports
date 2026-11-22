import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Phase } from '../phases/entities/phase.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { MatchPosition } from '../match-positions/entities/match-position.entity';
import { Goal } from '../goals/entities/goal.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Bet } from '../bets/entities/bet.entity';
import { MATCH_AUDIENCE_PORT } from '../common/contracts';
import { TeamsModule } from '../teams/teams.module';
import { VenuesModule } from '../venues/venues.module';
import { BallsModule } from '../balls/balls.module';
import { TournamentVenuesModule } from '../tournament-venues/tournament-venues.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BetSettlementModule } from '../bets/bet-settlement.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchesRepository } from './repositories/matches.repository';
import { MatchAudienceRepository } from './repositories/match-audience.repository';
import { MatchNotifier } from './match-notifier';
import { MatchDraftResolver } from './services/match-draft.resolver';
import { MatchResultService } from './services/match-result.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      Phase,
      Registration,
      MatchPosition,
      Goal,
      Ticket,
      Bet,
    ]),
    TeamsModule,
    VenuesModule,
    BallsModule,
    TournamentVenuesModule,
    NotificationsModule,
    BetSettlementModule,
  ],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    MatchDraftResolver,
    MatchResultService,
    MatchesRepository,
    MatchAudienceRepository,
    {
      provide: MATCH_AUDIENCE_PORT,
      useExisting: MatchAudienceRepository,
    },
    MatchNotifier,
  ],
  // Lo usan los módulos de Fercho (getMatchOrFail y MatchNotifier).
  exports: [MatchesService, MatchNotifier],
})
export class MatchesModule {}
