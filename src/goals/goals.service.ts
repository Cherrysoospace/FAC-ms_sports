import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { GoalsRepository } from './repositories/goals.repository';
import { GoalMapper } from './mappers/goal.mapper';
import { GoalRulesPolicy } from './policies/goal-rules.policy';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalQueryDto } from './dto/goal-query.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { Match } from '../matches/entities/match.entity';
import { MatchesService } from '../matches/matches.service';
import { MatchNotifier } from '../matches/match-notifier';
import { MatchRulesPolicy } from '../matches/policies/match-rules.policy';
import { Player } from '../players/entities/player.entity';
import { PlayersService } from '../players/players.service';
import { TeamPlayersService } from '../team-players/team-players.service';
import { TournamentStatusPolicy } from '../tournaments/policies/tournament-status.policy';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    private readonly goalsRepository: GoalsRepository,
    private readonly goalMapper: GoalMapper,
    private readonly matchesService: MatchesService,
    private readonly playersService: PlayersService,
    private readonly teamPlayersService: TeamPlayersService,
    private readonly matchNotifier: MatchNotifier,
  ) {}

  async findAll(query: GoalQueryDto): Promise<GoalResponseDto[]> {
    const goals = await this.goalsRepository.findByFilters(query);
    return this.goalMapper.toDtoList(goals);
  }

  async findOne(id: number): Promise<GoalResponseDto> {
    return this.goalMapper.toDto(await this.getGoalOrFail(id));
  }

  async create(dto: CreateGoalDto): Promise<GoalResponseDto> {
    const match = await this.matchesService.getMatchOrFail(dto.matchId);
    this.assertMatchAcceptsAnnotations(match);

    const player = await this.playersService.getActivePlayerOrFail(
      dto.playerId,
    );
    await this.assertPlayerInMatch(player, match);

    const saved = await this.goalRepository.save(
      this.goalMapper.toEntity(match, player, dto),
    );
    const hydrated = await this.getGoalOrFail(saved.id);
    await this.matchNotifier.notifyGoalRecorded(match, hydrated);
    return this.goalMapper.toDto(hydrated);
  }

  async update(id: number, dto: UpdateGoalDto): Promise<GoalResponseDto> {
    const goal = await this.getGoalOrFail(id);
    const match = await this.matchesService.getMatchOrFail(goal.match.id);
    this.assertMatchAcceptsAnnotations(match);

    let player: Player | undefined;
    if (dto.playerId !== undefined && dto.playerId !== goal.player.id) {
      player = await this.playersService.getActivePlayerOrFail(dto.playerId);
      await this.assertPlayerInMatch(player, match);
    }

    await this.goalRepository.save(
      this.goalMapper.mergeEntity(goal, dto, player),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const goal = await this.getGoalOrFail(id);
    const match = await this.matchesService.getMatchOrFail(goal.match.id);
    this.assertMatchAcceptsAnnotations(match);

    // Solo elimina la anotación; partido y jugador se mantienen (onDelete: NO ACTION).
    await this.goalRepository.remove(goal);
    return { message: `Anotación #${id} eliminada correctamente` };
  }

  private async getGoalOrFail(id: number): Promise<Goal> {
    const goal = await this.goalsRepository.findOneWithRelations(id);
    if (!goal) throw ResourceNotFoundException.of('Anotación', id);
    return goal;
  }

  private assertMatchAcceptsAnnotations(match: Match): void {
    MatchRulesPolicy.assertAnnotationsAllowed(match.status);
    if (TournamentStatusPolicy.isClosed(match.phase.tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo ${match.phase.tournament.name} ya terminó o fue cancelado: ` +
          'no se pueden gestionar anotaciones',
      );
    }
  }

  private async assertPlayerInMatch(
    player: Player,
    match: Match,
  ): Promise<void> {
    const contracts = await this.teamPlayersService.findAll({
      playerId: player.id,
    });
    GoalRulesPolicy.assertPlayerParticipates(player.fullName, contracts, match);
  }
}
