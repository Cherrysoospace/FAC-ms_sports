import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import { FinalPhase } from '../phases/entities/final-phase.entity';
import { Team } from '../teams/entities/team.entity';
import { Match } from '../matches/entities/match.entity';
import { Goal } from '../goals/entities/goal.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TournamentDevelopmentController } from './tournament-development.controller';
import { TournamentDevelopmentService } from './tournament-development.service';
import { TournamentDevelopmentRepository } from './repositories/tournament-development.repository';

// HU-GC-08b: consulta de solo lectura del desarrollo de un torneo.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupPhase,
      FinalPhase,
      Team,
      Match,
      Goal,
      Registration,
    ]),
    // getTournamentOrFail (404 con el mismo mensaje de torneos)
    TournamentsModule,
  ],
  controllers: [TournamentDevelopmentController],
  providers: [TournamentDevelopmentService, TournamentDevelopmentRepository],
})
export class TournamentDevelopmentModule {}
