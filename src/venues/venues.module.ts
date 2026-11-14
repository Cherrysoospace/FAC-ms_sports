import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { Location } from '../locations/entities/location.entity';
import { Match } from '../matches/entities/match.entity';
import { TournamentVenue } from '../tournament-venues/entities/tournament-venue.entity';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { VenuesRepository } from './repositories/venues.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue, Location, Match, TournamentVenue]),
  ],
  controllers: [VenuesController],
  providers: [VenuesService, VenuesRepository],
  // Lo usan Partido, Escenario-Torneo y Localidad (getVenueOrFail).
  exports: [VenuesService],
})
export class VenuesModule {}
