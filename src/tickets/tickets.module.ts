import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FansModule } from '../fans/fans.module';
import { Location } from '../locations/entities/location.entity';
import { LocationsModule } from '../locations/locations.module';
import { Match } from '../matches/entities/match.entity';
import { MatchesModule } from '../matches/matches.module';
import { Ticket } from './entities/ticket.entity';
import { TicketMapper } from './mappers/ticket.mapper';
import { MeTicketsController } from './me-tickets.controller';
import { TicketCapacityModule } from './ticket-capacity.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Location, Match]),
    TicketCapacityModule,
    LocationsModule,
    MatchesModule,
    FansModule,
  ],
  controllers: [TicketsController, MeTicketsController],
  providers: [TicketsService, TicketMapper],
  exports: [TicketsService, TicketCapacityModule],
})
export class TicketsModule {}
