import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';
import { Fan } from '../fans/entities/fan.entity';
import { FansService } from '../fans/fans.service';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { Match } from '../matches/entities/match.entity';
import { MatchesService } from '../matches/matches.service';
import { FanPaymentMethodsService } from '../payment-methods/fan-payment-methods.service';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { TournamentStatusPolicy } from '../tournaments/policies/tournament-status.policy';
import { BetNotifier } from './bet-notifier';
import { AvailableBetMatchesQueryDto } from './dto/available-bet-matches-query.dto';
import { BetQueryDto } from './dto/bet-query.dto';
import { BetResponseDto } from './dto/bet-response.dto';
import { CancelBetDto } from './dto/cancel-bet.dto';
import { CreateBetDto } from './dto/create-bet.dto';
import { MyBetQueryDto } from './dto/my-bet-query.dto';
import { PlaceBetDto } from './dto/place-bet.dto';
import { UpdateMyBetDto } from './dto/update-my-bet.dto';
import { Bet } from './entities/bet.entity';
import { BetStatus } from './enums/bet-status.enum';
import { BetMapper } from './mappers/bet.mapper';
import { BetRulesPolicy } from './policies/bet-rules.policy';
import { BetsRepository } from './repositories/bets.repository';

@Injectable()
export class BetsService {
  constructor(
    private readonly betsRepository: BetsRepository,
    private readonly betMapper: BetMapper,
    private readonly matchesService: MatchesService,
    private readonly fansService: FansService,
    private readonly fanPaymentMethodsService: FanPaymentMethodsService,
    private readonly betNotifier: BetNotifier,
    private readonly dataSource: DataSource,
  ) {}

  findAvailableMatches(
    query: AvailableBetMatchesQueryDto,
  ): Promise<MatchResponseDto[]> {
    return this.matchesService.findAvailableForBetting(query);
  }

  async findAll(query: BetQueryDto): Promise<BetResponseDto[]> {
    const bets = await this.betsRepository.findByFilters(query);
    return this.betMapper.toDtoList(bets);
  }

  async findOne(id: number): Promise<BetResponseDto> {
    const bet = await this.getBetOrFail(id);
    return this.betMapper.toDto(bet);
  }

  async create(dto: CreateBetDto): Promise<BetResponseDto> {
    const fan = await this.fansService.getActiveFanOrFail(dto.fanId);
    return this.placeBet(fan, dto);
  }

  async voidBet(id: number, dto: CancelBetDto): Promise<BetResponseDto> {
    const existing = await this.getBetOrFail(id);
    BetRulesPolicy.assertVoidableByAdmin(existing.status);

    await this.dataSource.transaction(async (manager) => {
      await manager.findOne(Match, {
        where: { id: existing.match.id },
        lock: { mode: 'pessimistic_write' },
      });
      const lockedBet = await manager.findOne(Bet, { where: { id } });
      if (!lockedBet) {
        throw ResourceNotFoundException.of('Apuesta', id);
      }

      BetRulesPolicy.assertVoidableByAdmin(lockedBet.status);
      lockedBet.status = BetStatus.VOID;
      lockedBet.payout = lockedBet.amount;
      lockedBet.settledAt = new Date();
      lockedBet.settlementNote =
        dto.reason?.trim() || 'Apuesta anulada por el administrador deportivo';

      await manager.save(Bet, lockedBet);
    });

    const hydrated = await this.getBetOrFail(id);
    await this.betNotifier.notifyBetSettled(hydrated);
    return this.betMapper.toDto(hydrated);
  }

  async findMine(
    user: AuthenticatedUser,
    query: MyBetQueryDto,
  ): Promise<BetResponseDto[]> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const bets = await this.betsRepository.findByFilters({
      matchId: query.matchId,
      status: query.status,
      tournamentId: query.tournamentId,
      fanId: fan.id,
    });
    return this.betMapper.toDtoList(bets);
  }

  async findOneMine(
    user: AuthenticatedUser,
    id: number,
  ): Promise<BetResponseDto> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const bet = await this.getBetOrFail(id);
    this.assertOwnership(bet, fan.id);
    return this.betMapper.toDto(bet);
  }

  async placeMine(
    user: AuthenticatedUser,
    dto: PlaceBetDto,
  ): Promise<BetResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    return this.placeBet(fan, dto);
  }

  async updateMine(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateMyBetDto,
  ): Promise<BetResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const bet = await this.getBetOrFail(id);
    this.assertOwnership(bet, fan.id);
    BetRulesPolicy.assertModifiable(
      bet.status,
      bet.match.status,
      bet.match.bettingOpen,
    );

    const nextMethod =
      dto.fanPaymentMethodId !== undefined
        ? await this.fanPaymentMethodsService.getOwnedActiveMethodOrFail(
            fan.id,
            dto.fanPaymentMethodId,
          )
        : null;

    await this.dataSource.transaction(async (manager) => {
      const lockedMatch = await manager.findOne(Match, {
        where: { id: bet.match.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedMatch) {
        throw ResourceNotFoundException.of('Partido', bet.match.id);
      }

      const lockedBet = await manager.findOne(Bet, { where: { id } });
      if (!lockedBet) {
        throw ResourceNotFoundException.of('Apuesta', id);
      }

      BetRulesPolicy.assertModifiable(
        lockedBet.status,
        lockedMatch.status,
        lockedMatch.bettingOpen,
      );

      if (dto.selection !== undefined) {
        lockedBet.selection = dto.selection;
      }
      if (dto.amount !== undefined) {
        lockedBet.amount = dto.amount.toFixed(2);
      }
      if (nextMethod) {
        lockedBet.fanPaymentMethod = nextMethod;
      }

      await manager.save(Bet, lockedBet);
    });

    return this.findOne(id);
  }

  async cancelMine(
    user: AuthenticatedUser,
    id: number,
    dto: CancelBetDto,
  ): Promise<BetResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const bet = await this.getBetOrFail(id);
    this.assertOwnership(bet, fan.id);
    BetRulesPolicy.assertCancellableByFan(
      bet.status,
      bet.match.status,
      bet.match.bettingOpen,
    );

    await this.dataSource.transaction(async (manager) => {
      const lockedMatch = await manager.findOne(Match, {
        where: { id: bet.match.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedMatch) {
        throw ResourceNotFoundException.of('Partido', bet.match.id);
      }

      const lockedBet = await manager.findOne(Bet, { where: { id } });
      if (!lockedBet) {
        throw ResourceNotFoundException.of('Apuesta', id);
      }

      BetRulesPolicy.assertCancellableByFan(
        lockedBet.status,
        lockedMatch.status,
        lockedMatch.bettingOpen,
      );

      lockedBet.status = BetStatus.CANCELLED;
      lockedBet.payout = lockedBet.amount;
      lockedBet.settledAt = new Date();
      lockedBet.settlementNote =
        dto.reason?.trim() ||
        'Apuesta cancelada por el aficionado antes del inicio del partido';

      await manager.save(Bet, lockedBet);
    });

    const hydrated = await this.getBetOrFail(id);
    await this.betNotifier.notifyBetSettled(hydrated);
    return this.betMapper.toDto(hydrated);
  }

  private async placeBet(fan: Fan, dto: PlaceBetDto): Promise<BetResponseDto> {
    const match = await this.matchesService.getMatchOrFail(dto.matchId);
    if (TournamentStatusPolicy.isClosed(match.phase.tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo ${match.phase.tournament.name} ya terminó o fue cancelado: no se permiten apuestas`,
      );
    }
    BetRulesPolicy.assertMatchBettable(match.status, match.bettingOpen);

    const paymentMethod =
      await this.fanPaymentMethodsService.getOwnedActiveMethodOrFail(
        fan.id,
        dto.fanPaymentMethodId,
      );

    const savedId = await this.dataSource.transaction(async (manager) => {
      // Bloqueo pesimista sobre el partido para evitar registrar apuestas mientras inicia o se cancela.
      const lockedMatch = await manager.findOne(Match, {
        where: { id: dto.matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedMatch) {
        throw ResourceNotFoundException.of('Partido', dto.matchId);
      }
      BetRulesPolicy.assertMatchBettable(
        lockedMatch.status,
        lockedMatch.bettingOpen,
      );

      const existing = await this.betsRepository.findByMatchAndFan(
        dto.matchId,
        fan.id,
        manager,
      );
      if (existing) {
        throw new ApplicationException(
          ErrorCase.ALREADY_EXISTS,
          'El aficionado ya tiene una apuesta registrada para este partido',
        );
      }

      const entity = this.betMapper.toEntity(
        lockedMatch,
        fan,
        paymentMethod,
        dto.selection,
        dto.amount,
        dto.odds,
      );
      const saved = await manager.save(Bet, entity);
      return saved.id;
    });

    const hydrated = await this.getBetOrFail(savedId);
    await this.betNotifier.notifyBetPlaced(hydrated);
    return this.betMapper.toDto(hydrated);
  }

  private async getBetOrFail(id: number): Promise<Bet> {
    const bet = await this.betsRepository.findOneWithRelations(id);
    if (!bet) {
      throw ResourceNotFoundException.of('Apuesta', id);
    }
    return bet;
  }

  private assertOwnership(bet: Bet, fanId: number): void {
    if (bet.fan.id !== fanId) {
      throw new ApplicationException(
        ErrorCase.FORBIDDEN,
        'No tienes permiso para acceder o modificar la apuesta de otro aficionado',
      );
    }
  }
}

