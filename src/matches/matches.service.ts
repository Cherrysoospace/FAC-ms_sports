import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchStatus } from './enums/match-status.enum';
import {
  MatchesRepository,
  type AvailableBetMatchesFilters,
} from './repositories/matches.repository';
import { MatchMapper } from './mappers/match.mapper';
import { MatchNotifier } from './match-notifier';
import { MatchRulesPolicy } from './policies/match-rules.policy';
import { MatchDraftPolicy } from './policies/match-draft.policy';
import { MatchDraftResolver } from './services/match-draft.resolver';
import { MatchResultService } from './services/match-result.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { joinList, plural } from '../common/text/spanish-list';
import {
  BusinessRuleException,
  ResourceNotFoundException,
} from '../common/exceptions';

/**
 * HU-GC-06: CRUD de partidos. Solo orquesta:
 * - Reglas puras: MatchRulesPolicy y MatchDraftPolicy.
 * - Validar equipos, escenario, pelota y fecha: MatchDraftResolver.
 * - Resultado final y cancelación con liquidación de apuestas: MatchResultService.
 */
@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly matchesRepository: MatchesRepository,
    private readonly matchDraftResolver: MatchDraftResolver,
    private readonly matchResultService: MatchResultService,
    private readonly matchNotifier: MatchNotifier,
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
    const phase = await this.matchDraftResolver.getOpenPhaseOrFail(dto.phaseId);
    const resolved = await this.matchDraftResolver.resolve(
      phase,
      MatchDraftPolicy.fromCreate(dto),
    );

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

  // Editar datos (solo programados), abrir/cerrar apuestas o cambiar el estado.
  async update(id: number, dto: UpdateMatchDto): Promise<MatchResponseDto> {
    const match = await this.getMatchOrFail(id);
    const changesData = MatchDraftPolicy.changesData(dto);
    if (changesData) await this.applyDataChanges(match, dto);

    if (dto.bettingOpen !== undefined) {
      MatchRulesPolicy.assertBettingChange(
        match.status,
        dto.status ?? match.status,
        dto.bettingOpen,
        match.phase.tournament,
      );
      match.bettingOpen = dto.bettingOpen;
    }

    if (dto.status !== undefined) {
      MatchRulesPolicy.assertTransition(match.status, dto.status);
      if (
        dto.status === MatchStatus.CANCELLED &&
        match.status !== MatchStatus.CANCELLED
      ) {
        await this.matchResultService.cancel(id, match, changesData);
        return this.findOne(id);
      }
      match.status = dto.status;
      // Las apuestas se cierran cuando el partido empieza (HU-GC-11)
      if (dto.status !== MatchStatus.SCHEDULED) match.bettingOpen = false;
    }

    await this.matchRepository.save(match);
    return this.findOne(id);
  }

  // Equipos, escenario, pelota o fecha: solo programados, con las mismas
  // validaciones que al crear (sobre los valores finales del partido).
  private async applyDataChanges(
    match: Match,
    dto: UpdateMatchDto,
  ): Promise<void> {
    MatchRulesPolicy.assertEditable(match.status);
    const phase = await this.matchDraftResolver.getOpenPhaseOrFail(
      match.phase.id,
    );
    const resolved = await this.matchDraftResolver.resolve(
      phase,
      MatchDraftPolicy.mergeForUpdate(match, dto),
      match.id,
    );
    Object.assign(match, resolved);
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
}
