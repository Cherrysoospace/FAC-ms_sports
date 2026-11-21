import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FansModule } from '../fans/fans.module';
import { Match } from '../matches/entities/match.entity';
import { MatchesModule } from '../matches/matches.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { BetSettlementModule } from './bet-settlement.module';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';
import { Bet } from './entities/bet.entity';
import { BetMapper } from './mappers/bet.mapper';
import { MeBetsController } from './me-bets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bet, Match]),
    BetSettlementModule,
    MatchesModule,
    FansModule,
    PaymentMethodsModule,
  ],
  controllers: [BetsController, MeBetsController],
  providers: [BetsService, BetMapper],
  exports: [BetsService, BetSettlementModule],
})
export class BetsModule {}

