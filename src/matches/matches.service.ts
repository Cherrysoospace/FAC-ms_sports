import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchStatus } from './enums/match-status.enum';
import {
  MatchesRepository,
  type AvailableBetMatchesFilters,
} from './repositories/matches.repository';
import { MatchMapper } from './mappers/match.mapper';
import { MatchNotifier } from './match-notifier';
import {
  MatchRulesPolicy,
  PlayablePeriod,
} from './policies/match-rules.policy';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { RecordMatchResultDto } from './dto/record-match-result.dto';
import { Phase } from '../phases/entities/phase.entity';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import { Team } from '../teams/entities/team.entity';
import { Venue } from '../venues/entities/venue.entity';
import { TeamsService } from '../teams/teams.service';
import { VenuesService } from '../venues/venues.service';
import { BallsService } from '../balls/balls.service';
import { TournamentVenuesService } from '../tournament-venues/tournament-venues.service';
import { TournamentStatusPolicy } from '../tournaments/policies/tournament-status.policy';
import {
  BET_SETTLEMENT_PORT,
  type BetSettlementNotification,
  type IBetSettlementPort,
} from '../common/contracts';
import { joinList, plural } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

// Lo que se valida al crear o al editar: los valores finales del partido.
interface MatchDraft {
  homeTeamId: number;
  awayTeamId: number;
  venueId: number;
  ballId: number;
  scheduledAt: Date;
}

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly matchesRepository: MatchesRepository,
    private readonly teamsService: TeamsService,
    private readonly venuesService: VenuesService,
    private readonly ballsService: BallsService,
    private readonly tournamentVenuesService: TournamentVenuesService,
    private readonly matchNotifier: MatchNotifier,
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(BET_SETTLEMENT_PORT)
    private readonly betSettlementPort?: IBetSettlementPort,
  ) {}

  async findAll(query: MatchQueryDto): Promise<MatchResponseDto[]> {
    return MatchMapper.toResponseDtoList(
      await this.matchesRepository.findByFilters(query),
    );
  }

  async findAvailableForBetting(
    filters: AvailableBetMatchesFilters,
  ): Promise<MatchResponseDto[]> {
    return MatchMapper.toResponseDtoList(
      await this.matchesRepository.findAvailableForBetting(filters),
    );
  }

  async findOne(id: number): Promise<MatchResponseDto> {
    return MatchMapper.toResponseDto(await this.getMatchOrFail(id));
  }

  // Lo usan Anotación, Boleto, Apuesta y Posición espacial (módulos de Fercho).
  async getMatchOrFail(id: number): Promise<Match> {
    const match = await this.matchesRepository.findOneWithRelations(id);
    if (!match) throw ResourceNotFoundException.of('Partido', id);
    return match;
  }

  async create(dto: CreateMatchDto): Promise<MatchResponseDto> {
    const phase = await this.getOpenPhaseOrFail(dto.phaseId);
    const resolved = await this.resolveDraft(phase, {
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      venueId: dto.venueId,
      ballId: dto.ballId,
      scheduledAt: new Date(dto.scheduledAt),
    });

    const entity = new Match();
    entity.phase = phase;
    entity.status = MatchStatus.SCHEDULED;
    entity.bettingOpen = true;
    Object.assign(entity, resolved);
    const saved = await this.matchRepository.save(entity);

    const match = await this.getMatchOrFail(saved.id);
    await this.matchNotifier.notifyNewMatch(match);
    return MatchMapper.toResponseDto(match);
  }

  async update(id: number, dto: UpdateMatchDto): Promise<MatchResponseDto> {
    const match = await this.getMatchOrFail(id);

    const changesData =
      dto.homeTeamId !== undefined ||
      dto.awayTeamId !== undefined ||
      dto.venueId !== undefined ||
      dto.ballId !== undefined ||
      dto.scheduledAt !== undefined;

    if (changesData) {
      MatchRulesPolicy.assertEditable(match.status);
      const phase = await this.getOpenPhaseOrFail(match.phase.id);
      const resolved = await this.resolveDraft(
        phase,
        {
          homeTeamId: dto.homeTeamId ?? match.homeTeam.id,
          awayTeamId: dto.awayTeamId ?? match.awayTeam.id,
          venueId: dto.venueId ?? match.venue.id,
          ballId: dto.ballId ?? match.ball.id,
          scheduledAt: dto.scheduledAt
            ? new Date(dto.scheduledAt)
            : match.scheduledAt,
        },
        match.id,
      );
      Object.assign(match, resolved);
    }

    if (dto.bettingOpen !== undefined) {
      MatchRulesPolicy.assertBettingToggleAllowed(match.status);
      if (
        (dto.status ?? match.status) !== MatchStatus.SCHEDULED &&
        dto.bettingOpen
      ) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          'No se pueden dejar las apuestas abiertas al iniciar o cancelar el partido',
        );
      }
      if (
        dto.bettingOpen &&
        TournamentStatusPolicy.isClosed(match.phase.tournament.status)
      ) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El torneo ${match.phase.tournament.name} ya terminó o fue cancelado: no se pueden reabrir apuestas`,
        );
      }
      match.bettingOpen = dto.bettingOpen;
    }

    if (dto.status !== undefined) {
      MatchRulesPolicy.assertTransition(match.status, dto.status);
      if (
        dto.status === MatchStatus.CANCELLED &&
        match.status !== MatchStatus.CANCELLED
      ) {
        const pendingNotifications = await this.dataSource.transaction(
          async (manager) => {
            const locked = await manager.findOne(Match, {
              where: { id },
              lock: { mode: 'pessimistic_write' },
            });
            if (!locked) throw ResourceNotFoundException.of('Partido', id);

            MatchRulesPolicy.assertTransition(
              locked.status,
              MatchStatus.CANCELLED,
            );
            if (changesData) {
              MatchRulesPolicy.assertEditable(locked.status);
              locked.homeTeam = match.homeTeam;
              locked.awayTeam = match.awayTeam;
              locked.venue = match.venue;
              locked.ball = match.ball;
              locked.scheduledAt = match.scheduledAt;
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
        if (pendingNotifications.length > 0 && this.betSettlementPort) {
          await this.betSettlementPort.notifySettlementBatch(
            pendingNotifications,
          );
        }
        return this.findOne(id);
      }
      match.status = dto.status;
      // Las apuestas se cierran cuando el partido empieza (HU-GC-11)
      if (dto.status !== MatchStatus.SCHEDULED) match.bettingOpen = false;
    }

    await this.matchRepository.save(match);
    return this.findOne(id);
  }

  // HU-GC-07: única vía que registra resultado y pasa el partido a FINISHED.
  async recordResult(
    id: number,
    dto: RecordMatchResultDto,
  ): Promise<MatchResponseDto> {
    const match = await this.getMatchOrFail(id);
    MatchRulesPolicy.assertResultRecordable(match.status);

    if (TournamentStatusPolicy.isClosed(match.phase.tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo ${match.phase.tournament.name} ya terminó o fue cancelado: ` +
          'no se puede registrar ni modificar el resultado',
      );
    }

    const { isFirstFinalization, pendingNotifications } =
      await this.dataSource.transaction(async (manager) => {
        const locked = await manager.findOne(Match, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw ResourceNotFoundException.of('Partido', id);

        MatchRulesPolicy.assertResultRecordable(locked.status);
        const firstFinalization = locked.status !== MatchStatus.FINISHED;

        locked.homeScore = dto.homeScore;
        locked.awayScore = dto.awayScore;
        locked.status = MatchStatus.FINISHED;
        locked.bettingOpen = false;
        await manager.save(Match, locked);

        let notifications: BetSettlementNotification[] = [];
        if (firstFinalization && this.betSettlementPort) {
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
          notifications = settlement.pendingNotifications;
        }

        return {
          isFirstFinalization: firstFinalization,
          pendingNotifications: notifications,
        };
      });

    if (pendingNotifications.length > 0 && this.betSettlementPort) {
      await this.betSettlementPort.notifySettlementBatch(pendingNotifications);
    }

    const updated = await this.getMatchOrFail(id);
    const goals = await this.matchesRepository.findGoalsForSummary(id);
    await this.matchNotifier.notifyMatchResult(
      updated,
      isFirstFinalization,
      goals,
    );
    return MatchMapper.toResponseDto(updated);
  }

  async remove(id: number): Promise<{ message: string }> {
    const match = await this.getMatchOrFail(id);
    MatchRulesPolicy.assertDeletable(match.status);

    const [positions, goals, tickets, bets] = await Promise.all([
      this.matchesRepository.countPositions(id),
      this.matchesRepository.countGoals(id),
      this.matchesRepository.countTickets(id),
      this.matchesRepository.countBets(id),
    ]);

    const dependencies = [
      positions > 0 ? 'seguimiento espacial' : null,
      plural(goals, 'anotación', 'anotaciones'),
      plural(tickets, 'boleto', 'boletos'),
      plural(bets, 'apuesta', 'apuestas'),
    ].filter((dependency): dependency is string => dependency !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar porque tiene ${joinList(dependencies)} registrados. ` +
          'Si no se va a jugar, cancélelo',
      );
    }

    await this.matchRepository.remove(match);
    return { message: `Partido #${id} eliminado correctamente` };
  }

  // La fase debe existir y su torneo no puede estar finalizado ni cancelado.
  private async getOpenPhaseOrFail(phaseId: number): Promise<Phase> {
    const phase = await this.matchesRepository.findPhase(phaseId);
    if (!phase) throw ResourceNotFoundException.of('Fase', phaseId);
    if (TournamentStatusPolicy.isClosed(phase.tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo ${phase.tournament.name} ya terminó o fue cancelado: no se le pueden programar partidos`,
      );
    }
    return phase;
  }

  /**
   * Valida los valores finales del partido y devuelve las entidades:
   * equipos distintos, activos e inscritos (y del grupo, si la fase es de
   * grupos), escenario activo y habilitado para el torneo, pelota libre y
   * fecha dentro de la fase o del torneo.
   */
  private async resolveDraft(
    phase: Phase,
    draft: MatchDraft,
    matchId?: number,
  ): Promise<
    Pick<Match, 'homeTeam' | 'awayTeam' | 'venue' | 'ball' | 'scheduledAt'>
  > {
    MatchRulesPolicy.assertDifferentTeams(draft.homeTeamId, draft.awayTeamId);
    MatchRulesPolicy.assertWithinPeriod(
      draft.scheduledAt,
      this.playablePeriod(phase),
    );

    const [homeTeam, awayTeam] = await Promise.all([
      this.getEligibleTeamOrFail(draft.homeTeamId, phase),
      this.getEligibleTeamOrFail(draft.awayTeamId, phase),
    ]);
    const venue = await this.getEnabledVenueOrFail(draft.venueId, phase);
    const ball = await this.ballsService.getAvailableBallOrFail(
      draft.ballId,
      matchId,
    );

    return { homeTeam, awayTeam, venue, ball, scheduledAt: draft.scheduledAt };
  }

  private async getEligibleTeamOrFail(
    teamId: number,
    phase: Phase,
  ): Promise<Team> {
    const team = await this.teamsService.getActiveTeamOrFail(teamId);
    const tournament = phase.tournament;

    if (!(await this.matchesRepository.isRegistered(team.id, tournament.id))) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo ${team.name} no está inscrito en el torneo ${tournament.name}`,
      );
    }
    if (phase instanceof GroupPhase && team.group?.id !== phase.id) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo ${team.name} no pertenece al grupo ${phase.groupName}`,
      );
    }
    return team;
  }

  private async getEnabledVenueOrFail(
    venueId: number,
    phase: Phase,
  ): Promise<Venue> {
    const venue = await this.venuesService.getVenueOrFail(venueId);
    if (!venue.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario ${venue.name} está inactivo`,
      );
    }
    const enabled =
      await this.tournamentVenuesService.isVenueEnabledForTournament(
        phase.tournament.id,
        venue.id,
      );
    if (!enabled) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario ${venue.name} no está habilitado para el torneo ${phase.tournament.name}`,
      );
    }
    return venue;
  }

  // Fechas de la fase si las tiene; si no, las del torneo.
  private playablePeriod(phase: Phase): PlayablePeriod {
    if (phase.startDate && phase.endDate) {
      return {
        startDate: phase.startDate,
        endDate: phase.endDate,
        label: `las fechas de la fase ${phase.name}`,
      };
    }
    return {
      startDate: phase.tournament.startDate,
      endDate: phase.tournament.endDate,
      label: `las fechas del torneo ${phase.tournament.name}`,
    };
  }
}
