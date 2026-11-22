import { Inject, Injectable, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Match } from '../entities/match.entity';
import { MatchStatus } from '../enums/match-status.enum';
import { MatchesRepository } from '../repositories/matches.repository';
import { MatchMapper } from '../mappers/match.mapper';
import { MatchNotifier } from '../match-notifier';
import { MatchRulesPolicy } from '../policies/match-rules.policy';
import { MatchResponseDto } from '../dto/match-response.dto';
import { RecordMatchResultDto } from '../dto/record-match-result.dto';
import {
  BET_SETTLEMENT_PORT,
  type BetSettlementNotification,
  type IBetSettlementPort,
} from '../../common/contracts';
import { ResourceNotFoundException } from '../../common/exceptions';

/**
 * Cierre de un partido y liquidación de sus apuestas (HU-GC-07 y HU-GC-11):
 * - PUT /matches/:id/result: registra o corrige el marcador final.
 * - Cancelación desde PATCH /matches/:id { status: CANCELLED }.
 * En ambos casos bloquea el partido, guarda y liquida o anula las apuestas por
 * BET_SETTLEMENT_PORT en la misma transacción, y avisa por correo después.
 * Solo cambia si cambia cómo se cierra un partido y se liquidan sus apuestas.
 */
@Injectable()
export class MatchResultService {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly matchNotifier: MatchNotifier,
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(BET_SETTLEMENT_PORT)
    private readonly betSettlementPort?: IBetSettlementPort,
  ) {}

  // HU-GC-07: única vía que registra resultado y pasa el partido a FINISHED.
  async recordResult(
    id: number,
    dto: RecordMatchResultDto,
  ): Promise<MatchResponseDto> {
    const match = await this.getMatchOrFail(id);
    MatchRulesPolicy.assertResultRecordable(match.status);
    MatchRulesPolicy.assertTournamentOpen(
      match.phase.tournament,
      'no se puede registrar ni modificar el resultado',
    );

    const { isFirstFinalization, pendingNotifications } =
      await this.dataSource.transaction((manager) =>
        this.finalizeAndSettle(manager, match, dto),
      );

    await this.notifySettlement(pendingNotifications);

    const updated = await this.getMatchOrFail(id);
    const goals = await this.matchesRepository.findGoalsForSummary(id);
    await this.matchNotifier.notifyMatchResult(
      updated,
      isFirstFinalization,
      goals,
    );
    return MatchMapper.toResponseDto(updated);
  }

  /**
   * HU-GC-11: cancela el partido, cierra y anula sus apuestas.
   * `edited` trae los datos ya validados del mismo PATCH; se copian solo si
   * `applyDataChanges` (equipos, escenario, pelota y fecha).
   */
  async cancel(
    id: number,
    edited: Match,
    applyDataChanges: boolean,
  ): Promise<void> {
    const pendingNotifications = await this.dataSource.transaction(
      async (manager) => {
        const locked = await this.lockOrFail(manager, id);
        MatchRulesPolicy.assertTransition(locked.status, MatchStatus.CANCELLED);
        if (applyDataChanges) {
          MatchRulesPolicy.assertEditable(locked.status);
          locked.homeTeam = edited.homeTeam;
          locked.awayTeam = edited.awayTeam;
          locked.venue = edited.venue;
          locked.ball = edited.ball;
          locked.scheduledAt = edited.scheduledAt;
        }
        locked.status = MatchStatus.CANCELLED;
        locked.bettingOpen = false;
        await manager.save(Match, locked);

        if (this.betSettlementPort) {
          const settlement = await this.betSettlementPort.cancelForMatch(
            id,
            'El partido fue cancelado',
            manager,
          );
          return settlement.pendingNotifications;
        }
        return [] as BetSettlementNotification[];
      },
    );
    await this.notifySettlement(pendingNotifications);
  }

  // Dentro de la transacción: bloquea, guarda el marcador y, solo la primera
  // vez que el partido pasa a FINISHED, liquida las apuestas.
  private async finalizeAndSettle(
    manager: EntityManager,
    match: Match,
    dto: RecordMatchResultDto,
  ): Promise<{
    isFirstFinalization: boolean;
    pendingNotifications: BetSettlementNotification[];
  }> {
    const locked = await this.lockOrFail(manager, match.id);
    MatchRulesPolicy.assertResultRecordable(locked.status);
    const isFirstFinalization = locked.status !== MatchStatus.FINISHED;

    locked.homeScore = dto.homeScore;
    locked.awayScore = dto.awayScore;
    locked.status = MatchStatus.FINISHED;
    locked.bettingOpen = false;
    await manager.save(Match, locked);

    if (!isFirstFinalization || !this.betSettlementPort) {
      return { isFirstFinalization, pendingNotifications: [] };
    }
    const settlement = await this.betSettlementPort.settleForMatch(
      {
        matchId: match.id,
        homeTeamId: match.homeTeam.id,
        awayTeamId: match.awayTeam.id,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
      },
      manager,
    );
    return {
      isFirstFinalization,
      pendingNotifications: settlement.pendingNotifications,
    };
  }

  private async getMatchOrFail(id: number): Promise<Match> {
    const match = await this.matchesRepository.findOneWithRelations(id);
    if (!match) throw ResourceNotFoundException.of('Partido', id);
    return match;
  }

  private async lockOrFail(manager: EntityManager, id: number): Promise<Match> {
    const locked = await manager.findOne(Match, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) throw ResourceNotFoundException.of('Partido', id);
    return locked;
  }

  // Los correos van fuera de la transacción, cuando ya quedó confirmada.
  private async notifySettlement(
    notifications: BetSettlementNotification[],
  ): Promise<void> {
    if (notifications.length > 0 && this.betSettlementPort) {
      await this.betSettlementPort.notifySettlementBatch(notifications);
    }
  }
}
