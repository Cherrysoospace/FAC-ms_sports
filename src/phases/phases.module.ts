import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Phase } from './entities/phase.entity';
import { GroupPhase } from './entities/group-phase.entity';
import { FinalPhase } from './entities/final-phase.entity';
import { Match } from '../matches/entities/match.entity';
import { Team } from '../teams/entities/team.entity';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { TeamsModule } from '../teams/teams.module';
import { GroupPhasesController } from './controllers/group-phases.controller';
import { FinalPhasesController } from './controllers/final-phases.controller';
import { GroupPhasesService } from './services/group-phases.service';
import { GroupTeamsService } from './services/group-teams.service';
import { FinalPhasesService } from './services/final-phases.service';
import { PhaseRulesService } from './services/phase-rules.service';
import { PhasesRepository } from './repositories/phases.repository';

@Module({
  imports: [
    // Team: GroupTeamsService escribe Team.group y PhasesRepository cuenta equipos
    TypeOrmModule.forFeature([Phase, GroupPhase, FinalPhase, Match, Team]),
    TournamentsModule,
    // Reglas de inscripción y de equipo activo (GroupTeamsService)
    RegistrationsModule,
    TeamsModule,
  ],
  controllers: [GroupPhasesController, FinalPhasesController],
  providers: [
    GroupPhasesService,
    GroupTeamsService,
    FinalPhasesService,
    PhaseRulesService,
    PhasesRepository,
  ],
  // Los usará el módulo de Partido.
  exports: [GroupPhasesService, FinalPhasesService],
})
export class PhasesModule {}
