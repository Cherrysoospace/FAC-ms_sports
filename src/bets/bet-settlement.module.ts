import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BET_SETTLEMENT_PORT } from '../common/contracts';
import { NotificationsModule } from '../notifications/notifications.module';
import { BetNotifier } from './bet-notifier';
import { BetSettlementService } from './bet-settlement.service';
import { Bet } from './entities/bet.entity';
import { BetsRepository } from './repositories/bets.repository';

/**
 * Submódulo liviano que provee el contrato `BET_SETTLEMENT_PORT` sin crear
 * dependencias circulares entre `matches` y `bets`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bet]), NotificationsModule],
  providers: [
    BetsRepository,
    BetNotifier,
    BetSettlementService,
    {
      provide: BET_SETTLEMENT_PORT,
      useExisting: BetSettlementService,
    },
  ],
  exports: [
    BetsRepository,
    BetNotifier,
    BetSettlementService,
    BET_SETTLEMENT_PORT,
  ],
})
export class BetSettlementModule {}

