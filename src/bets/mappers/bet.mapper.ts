import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { Fan } from '../../fans/entities/fan.entity';
import { Match } from '../../matches/entities/match.entity';
import { FanPaymentMethod } from '../../payment-methods/entities/fan-payment-method.entity';
import {
  BetFanSummaryDto,
  BetMatchSummaryDto,
  BetPaymentMethodSummaryDto,
  BetResponseDto,
} from '../dto/bet-response.dto';
import { Bet } from '../entities/bet.entity';
import { BetSelection } from '../enums/bet-selection.enum';
import { BetStatus } from '../enums/bet-status.enum';
import { BetRulesPolicy } from '../policies/bet-rules.policy';

@Injectable()
export class BetMapper extends BaseMapper<Bet, BetResponseDto> {
  toDto(entity: Bet): BetResponseDto {
    const amount = Number(entity.amount);
    const odds = Number(entity.odds);

    const dto = new BetResponseDto();
    dto.id = entity.id;
    dto.selection = entity.selection;
    dto.amount = amount;
    dto.odds = odds;
    dto.potentialPayout = BetRulesPolicy.calculatePotentialPayout(amount, odds);
    dto.status = entity.status;
    dto.payout = entity.payout !== null ? Number(entity.payout) : null;
    dto.placedAt = entity.placedAt;
    dto.settledAt = entity.settledAt;
    dto.settlementNote = entity.settlementNote;
    dto.match = this.toMatchSummaryDto(entity.match);
    dto.fan = this.toFanSummaryDto(entity.fan);
    dto.paymentMethod = this.toPaymentMethodSummaryDto(entity.fanPaymentMethod);
    return dto;
  }

  toEntity(
    match: Match,
    fan: Fan,
    fanPaymentMethod: FanPaymentMethod,
    selection: BetSelection,
    amount: number,
    odds: number,
  ): Bet {
    const entity = new Bet();
    entity.match = match;
    entity.fan = fan;
    entity.fanPaymentMethod = fanPaymentMethod;
    entity.selection = selection;
    entity.amount = amount.toFixed(2);
    entity.odds = odds.toFixed(2);
    entity.status = BetStatus.PENDING;
    entity.payout = null;
    entity.settledAt = null;
    entity.settlementNote = null;
    return entity;
  }

  private toMatchSummaryDto(match: Match): BetMatchSummaryDto {
    const dto = new BetMatchSummaryDto();
    dto.id = match.id;
    dto.scheduledAt = match.scheduledAt;
    dto.status = match.status;
    dto.bettingOpen = match.bettingOpen;
    dto.homeScore = match.homeScore ?? null;
    dto.awayScore = match.awayScore ?? null;
    dto.homeTeamName = match.homeTeam.name;
    dto.awayTeamName = match.awayTeam.name;
    dto.venueName = match.venue.name;
    dto.tournamentId = match.phase.tournament.id;
    dto.tournamentName = match.phase.tournament.name;
    return dto;
  }

  private toFanSummaryDto(fan: Fan): BetFanSummaryDto {
    const dto = new BetFanSummaryDto();
    dto.id = fan.id;
    dto.fullName = fan.fullName;
    dto.documentNumber = fan.documentNumber;
    dto.email = fan.email;
    return dto;
  }

  private toPaymentMethodSummaryDto(
    fpm: FanPaymentMethod,
  ): BetPaymentMethodSummaryDto {
    const dto = new BetPaymentMethodSummaryDto();
    dto.id = fpm.id;
    dto.alias = fpm.alias;
    dto.reference = fpm.reference;
    dto.paymentMethodId = fpm.paymentMethod.id;
    dto.paymentMethodName = fpm.paymentMethod.name;
    dto.paymentMethodType = fpm.paymentMethod.type;
    return dto;
  }
}

