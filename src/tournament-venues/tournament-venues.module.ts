import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentVenue } from './entities/tournament-venue.entity';
import { Match } from '../matches/entities/match.entity';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { VenuesModule } from '../venues/venues.module';
import { TournamentVenuesController } from './tournament-venues.controller';
import { TournamentVenuesService } from './tournament-venues.service';
import { TournamentVenuesRepository } from './repositories/tournament-venues.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([TournamentVenue, Match]),
    TournamentsModule,
    VenuesModule,
  ],
  controllers: [TournamentVenuesController],
  providers: [TournamentVenuesService, TournamentVenuesRepository],
  // Lo usa el módulo de Partido (isVenueEnabledForTournament).
  exports: [TournamentVenuesService],
})
export class TournamentVenuesModule {}
