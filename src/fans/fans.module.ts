import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fan } from './entities/fan.entity';
import { FanTeam } from './entities/fan-team.entity';
import { FanPaymentMethod } from '../payment-methods/entities/fan-payment-method.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Bet } from '../bets/entities/bet.entity';
import { FansRepository } from './repositories/fans.repository';
import { FanTeamsRepository } from './repositories/fan-teams.repository';
import { FanMapper } from './mappers/fan.mapper';
import { FavoriteTeamMapper } from './mappers/favorite-team.mapper';
import { FansService } from './fans.service';
import { FavoriteTeamsService } from './favorite-teams.service';
import { FansController } from './fans.controller';
import { MeFanController } from './me-fan.controller';
import { MeFavoriteTeamsController } from './me-favorite-teams.controller';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fan, FanTeam, FanPaymentMethod, Ticket, Bet]),
    TeamsModule,
  ],
  controllers: [FansController, MeFanController, MeFavoriteTeamsController],
  providers: [
    FansService,
    FavoriteTeamsService,
    FansRepository,
    FanTeamsRepository,
    FanMapper,
    FavoriteTeamMapper,
  ],
  exports: [FansService, FanTeamsRepository],
})
export class FansModule { }
