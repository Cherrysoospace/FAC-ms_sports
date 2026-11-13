import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { Sport } from '../sports/entities/sport.entity';
import { Phase } from '../phases/entities/phase.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { TournamentVenue } from '../tournament-venues/entities/tournament-venue.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { TournamentsRepository } from './repositories/tournaments.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      Sport,
      Phase,
      Registration,
      TournamentVenue,
    ]),
  ],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentsRepository],
  // Lo usan Inscripción, Escenario-Torneo y las fases (getTournamentOrFail).
  exports: [TournamentsService],
})
export class TournamentsModule {}
