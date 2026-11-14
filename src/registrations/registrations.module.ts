import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './entities/registration.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './repositories/registrations.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registration,
      Team,
      TeamSport,
      Tournament,
      GroupPhase,
    ]),
    TournamentsModule,
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, RegistrationsRepository],
  // Lo usan otros módulos (isTeamActivelyRegistered).
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
