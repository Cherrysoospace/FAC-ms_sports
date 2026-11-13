import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinalPhase } from '../entities/final-phase.entity';
import { FinalRound } from '../enums/final-round.enum';
import { TournamentsService } from '../../tournaments/tournaments.service';
import { PhasesRepository } from '../repositories/phases.repository';
import { PhaseRulesService } from './phase-rules.service';
import { FinalPhaseMapper } from '../mappers/final-phase.mapper';
import { CreateFinalPhaseDto } from '../dto/create-final-phase.dto';
import { UpdateFinalPhaseDto } from '../dto/update-final-phase.dto';
import { FinalPhaseQueryDto } from '../dto/final-phase-query.dto';
import { FinalPhaseResponseDto } from '../dto/final-phase-response.dto';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../../common/exceptions';

// Posición de cada ronda en el cuadro eliminatorio. THIRD_PLACE y FINAL
// tienen la misma posición: pueden compartir order (y no se restringen
// entre sí).
const ROUND_SEQUENCE: Record<FinalRound, number> = {
  [FinalRound.ROUND_OF_16]: 1,
  [FinalRound.QUARTER_FINAL]: 2,
  [FinalRound.SEMI_FINAL]: 3,
  [FinalRound.THIRD_PLACE]: 4,
  [FinalRound.FINAL]: 4,
};

@Injectable()
export class FinalPhasesService {
  constructor(
    @InjectRepository(FinalPhase)
    private readonly finalPhaseRepository: Repository<FinalPhase>,
    private readonly phasesRepository: PhasesRepository,
    private readonly phaseRules: PhaseRulesService,
    private readonly tournamentsService: TournamentsService,
  ) {}

  async findAll(query: FinalPhaseQueryDto): Promise<FinalPhaseResponseDto[]> {
    const phases = await this.phasesRepository.findFinalsByFilters(query);
    const matches = await this.phasesRepository.countMatchesByPhaseIds(
      phases.map((p) => p.id),
    );
    return FinalPhaseMapper.toResponseDtoList(phases, matches);
  }

  async findOne(id: number): Promise<FinalPhaseResponseDto> {
    const phase = await this.getFinalPhaseOrFail(id);
    const matchesCount = await this.phasesRepository.countMatches(id);
    return FinalPhaseMapper.toResponseDto(phase, matchesCount);
  }

  async getFinalPhaseOrFail(id: number): Promise<FinalPhase> {
    const phase = await this.finalPhaseRepository.findOne({
      where: { id },
      relations: { tournament: true },
    });
    if (!phase) throw ResourceNotFoundException.of('Fase final', id);
    return phase;
  }

  async create(dto: CreateFinalPhaseDto): Promise<FinalPhaseResponseDto> {
    const tournament = await this.tournamentsService.getTournamentOrFail(
      dto.tournamentId,
    );
    this.phaseRules.assertTournamentEditable(tournament);
    await this.phaseRules.assertOrderType(tournament.id, dto.order, 'FINAL');
    await this.assertRoundAvailable(tournament.id, dto.round);
    await this.assertRoundSequence(tournament.id, dto.round, dto.order);
    this.phaseRules.assertDatesInsideTournament(
      dto.startDate,
      dto.endDate,
      tournament,
    );

    const saved = await this.finalPhaseRepository.save(
      FinalPhaseMapper.toEntity(dto, tournament),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateFinalPhaseDto,
  ): Promise<FinalPhaseResponseDto> {
    const phase = await this.getFinalPhaseOrFail(id);
    const tournament = phase.tournament;
    this.phaseRules.assertTournamentEditable(tournament);

    if (dto.order !== undefined && dto.order !== phase.order) {
      await this.phaseRules.assertOrderType(
        tournament.id,
        dto.order,
        'FINAL',
        id,
      );
    }
    const roundChanges = dto.round !== undefined && dto.round !== phase.round;
    if (roundChanges && dto.round !== undefined) {
      await this.assertRoundAvailable(tournament.id, dto.round, id);
    }
    const finalOrder = dto.order ?? phase.order;
    if (roundChanges || finalOrder !== phase.order) {
      await this.assertRoundSequence(
        tournament.id,
        dto.round ?? phase.round,
        finalOrder,
        id,
      );
    }
    this.phaseRules.assertDatesInsideTournament(
      dto.startDate !== undefined ? dto.startDate : phase.startDate,
      dto.endDate !== undefined ? dto.endDate : phase.endDate,
      tournament,
    );

    await this.finalPhaseRepository.save(
      FinalPhaseMapper.mergeEntity(phase, dto),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const phase = await this.getFinalPhaseOrFail(id);
    this.phaseRules.assertTournamentEditable(phase.tournament);
    await this.phaseRules.assertNoMatches(
      id,
      `la fase final ${phase.round}`,
    );

    await this.finalPhaseRepository.remove(phase);
    return { message: `Fase final #${id} eliminada correctamente` };
  }

  /**
   * El order debe respetar la secuencia de rondas: mayor que el de todos los
   * grupos y que el de las rondas anteriores, y menor que el de las rondas
   * posteriores que ya existan en el torneo.
   */
  private async assertRoundSequence(
    tournamentId: number,
    round: FinalRound,
    order: number,
    excludeId?: number,
  ): Promise<void> {
    const [others, maxGroupOrder] = await Promise.all([
      this.phasesRepository.findFinalsByTournament(tournamentId, excludeId),
      this.phasesRepository.findMaxGroupOrder(tournamentId),
    ]);
    const position = ROUND_SEQUENCE[round];

    // Límite inferior (exclusivo) y su motivo.
    let lower = maxGroupOrder ?? 0;
    let lowerReason =
      maxGroupOrder !== null ? `los grupos (orden ${maxGroupOrder})` : null;
    // Límite superior (exclusivo) y su motivo.
    let upper: number | null = null;
    let upperReason: string | null = null;

    for (const other of others) {
      const otherPosition = ROUND_SEQUENCE[other.round];
      if (otherPosition < position && other.order >= lower) {
        lower = other.order;
        lowerReason = `${other.round} (orden ${other.order})`;
      } else if (
        otherPosition > position &&
        (upper === null || other.order < upper)
      ) {
        upper = other.order;
        upperReason = `${other.round} (orden ${other.order})`;
      }
    }

    if (order > lower && (upper === null || order < upper)) return;

    const min = lower + 1;
    const reasons = [
      lowerReason ? `después de ${lowerReason}` : null,
      upperReason ? `antes de ${upperReason}` : null,
    ].filter((r): r is string => r !== null);
    const detail = reasons.length > 0 ? ` (${reasons.join(' y ')})` : '';

    let range: string;
    if (upper === null) range = `${min} o mayor`;
    else if (upper - 1 < min) range = 'ninguno: no queda un orden libre';
    else range = `de ${min} a ${upper - 1}`;

    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El orden ${order} no es válido para ${round}. Rango permitido: ` +
        `${range}${detail}`,
    );
  }

  private async assertRoundAvailable(
    tournamentId: number,
    round: FinalRound,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.phasesRepository.findFinalByRound(
      tournamentId,
      round,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `El torneo ya tiene una fase ${round}`,
      );
    }
  }
}
