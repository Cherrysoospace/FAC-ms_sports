import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PAYMENT_METHOD_VALIDATORS,
  type IPaymentMethodValidator,
} from '../common/contracts';
import { FansModule } from '../fans/fans.module';
import { Bet } from '../bets/entities/bet.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { FanPaymentMethod } from './entities/fan-payment-method.entity';
import { PaymentMethodsRepository } from './repositories/payment-methods.repository';
import { FanPaymentMethodsRepository } from './repositories/fan-payment-methods.repository';
import { PaymentMethodMapper } from './mappers/payment-method.mapper';
import { FanPaymentMethodMapper } from './mappers/fan-payment-method.mapper';
import { PaymentMethodsService } from './payment-methods.service';
import { FanPaymentMethodsService } from './fan-payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { MePaymentMethodsController } from './me-payment-methods.controller';
import { CardPaymentMethodValidator } from './validators/card-payment-method.validator';
import { PsePaymentMethodValidator } from './validators/pse-payment-method.validator';
import { DigitalWalletPaymentMethodValidator } from './validators/digital-wallet-payment-method.validator';
import { BankTransferPaymentMethodValidator } from './validators/bank-transfer-payment-method.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethod, FanPaymentMethod, Bet]),
    FansModule,
  ],
  controllers: [PaymentMethodsController, MePaymentMethodsController],
  providers: [
    PaymentMethodsRepository,
    FanPaymentMethodsRepository,
    PaymentMethodMapper,
    FanPaymentMethodMapper,
    PaymentMethodsService,
    FanPaymentMethodsService,
    CardPaymentMethodValidator,
    PsePaymentMethodValidator,
    DigitalWalletPaymentMethodValidator,
    BankTransferPaymentMethodValidator,
    {
      provide: PAYMENT_METHOD_VALIDATORS,
      inject: [
        CardPaymentMethodValidator,
        PsePaymentMethodValidator,
        DigitalWalletPaymentMethodValidator,
        BankTransferPaymentMethodValidator,
      ],
      useFactory: (
        card: CardPaymentMethodValidator,
        pse: PsePaymentMethodValidator,
        wallet: DigitalWalletPaymentMethodValidator,
        bank: BankTransferPaymentMethodValidator,
      ): readonly IPaymentMethodValidator[] => [card, pse, wallet, bank],
    },
  ],
  exports: [
    PaymentMethodsService,
    FanPaymentMethodsService,
    FanPaymentMethodsRepository,
  ],
})
export class PaymentMethodsModule {}

