import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { Sport } from '../sports/entities/sport.entity';
import { SportsService } from '../sports/sports.service';
import { TournamentStatus } from './enums/tournament-status.enum';
import { TournamentsRepository } from './repositories/tournaments.repository';
import { TournamentMapper } from './mappers/tournament.mapper';
import { TournamentStatusPolicy } from './policies/tournament-status.policy';
import { TournamentDatesValidator } from './policies/tournament-dates.validator';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import { joinList, plural } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

/**
 * Orquesta los casos de uso del torneo. Las reglas viven en
 * TournamentStatusPolicy (estados) y TournamentDatesValidator (fechas).
 */
@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly sportsService: SportsService,
  ) {}

  async findAll(query: TournamentQueryDto): Promise<TournamentResponseDto[]> {
    const tournaments = await this.tournamentsRepository.findByFilters(query);
    const counts = await this.tournamentsRepository.countsByTournamentIds(
      tournaments.map((t) => t.id),
    );
    return TournamentMapper.toResponseDtoList(tournaments, counts);
  }

  async findOne(id: number): Promise<TournamentResponseDto> {
    const tournament = await this.getTournamentOrFail(id);
    const [registrationsCount, phasesCount] = await Promise.all([
      this.tournamentsRepository.countActiveRegistrations(id),
      this.tournamentsRepository.countPhases(id),
    ]);
    return TournamentMapper.toResponseDto(tournament, {
      registrationsCount,
      phasesCount,
    });
  }

  // Lo usan Inscripción, Escenario-Torneo y las fases.
  async getTournamentOrFail(id: number): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
      relations: { sport: true },
    });
    if (!tournament) throw ResourceNotFoundException.of('Torneo', id);
    return tournament;
  }

  async create(dto: CreateTournamentDto): Promise<TournamentResponseDto> {
    const sport = await this.getActiveSport(dto.sportId);
    await this.assertNameAvailable(dto.name, sport);
    TournamentDatesValidator.assertValid({
      startDate: dto.startDate,
      endDate: dto.endDate,
      registrationOpensAt: new Date(dto.registrationOpensAt),
      registrationClosesAt: new Date(dto.registrationClosesAt),
    });

    const saved = await this.tournamentRepository.save(
      TournamentMapper.toEntity(dto, sport),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateTournamentDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.getTournamentOrFail(id);

    // e) Torneo iniciado, finalizado o cancelado: solo status y active.
    this.assertLockedFieldsUnchanged(tournament, dto);

    // a) Deporte: solo se valida si cambia.
    const sportChanges =
      dto.sportId !== undefined && dto.sportId !== tournament.sport.id;
    const newSport =
      sportChanges && dto.sportId !== undefined
        ? await this.getSportForChange(id, dto.sportId)
        : undefined;

    // b) Nombre único por deporte (con el nombre y deporte finales).
    const nameChanges = dto.name !== undefined && dto.name !== tournament.name;
    if (nameChanges || sportChanges) {
      await this.assertNameAvailable(
        dto.name ?? tournament.name,
        newSport ?? tournament.sport,
        id,
      );
    }

    // c) Fechas: se validan los valores finales si cambia alguna.
    const dates = TournamentDatesValidator.mergeForUpdate(tournament, dto);
    if (dates) TournamentDatesValidator.assertValid(dates);

    // d) Estado.
    if (dto.status !== undefined && dto.status !== tournament.status) {
      await this.assertStatusTransition(id, tournament.status, dto.status);
    }

    await this.tournamentRepository.save(
      TournamentMapper.mergeEntity(tournament, dto, newSport),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const tournament = await this.getTournamentOrFail(id);

    const [phases, registrations, venues] = await Promise.all([
      this.tournamentsRepository.countPhases(id),
      this.tournamentsRepository.countRegistrations(id),
      this.tournamentsRepository.countTournamentVenues(id),
    ]);

    const dependencies = [
      plural(phases, 'fase', 'fases'),
      plural(registrations, 'inscripción', 'inscripciones'),
      plural(venues, 'escenario', 'escenarios'),
    ].filter((d): d is string => d !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar porque tiene ${joinList(dependencies)} ` +
          'asociados. Cámbielo a CANCELLED o desactívelo con ' +
          'PATCH { "active": false }',
      );
    }

    await this.tournamentRepository.remove(tournament);
    return { message: `Torneo #${id} eliminado correctamente` };
  }

  // La regla (y su mensaje) es de SportsService.
  private getActiveSport(sportId: number): Promise<Sport> {
    return this.sportsService.getActiveSportOrFail(sportId);
  }

  // El deporte no cambia si el torneo ya tiene inscripciones o fases.
  private async getSportForChange(id: number, sportId: number): Promise<Sport> {
    const [registrations, phases] = await Promise.all([
      this.tournamentsRepository.countRegistrations(id),
      this.tournamentsRepository.countPhases(id),
    ]);
    const dependencies = [
      plural(registrations, 'inscripción', 'inscripciones'),
      plural(phases, 'fase', 'fases'),
    ].filter((d): d is string => d !== null);
    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        'No se puede cambiar el deporte porque el torneo ya tiene ' +
          joinList(dependencies),
      );
    }
    return this.getActiveSport(sportId);
  }

  private async assertNameAvailable(
    name: string,
    sport: Sport,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.tournamentsRepository.findByNameAndSport(
      name,
      sport.id,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un torneo con el nombre "${name}" para el deporte ` +
          `"${sport.name}"`,
      );
    }
  }

  // Solo cuenta las inscripciones si la transición lo necesita (iniciar).
  private async assertStatusTransition(
    id: number,
    from: TournamentStatus,
    to: TournamentStatus,
  ): Promise<void> {
    const activeRegistrations =
      to === TournamentStatus.IN_PROGRESS &&
      TournamentStatusPolicy.canTransition(from, to)
        ? await this.tournamentsRepository.countActiveRegistrations(id)
        : 0;
    TournamentStatusPolicy.assertTransition(from, to, activeRegistrations);
  }

  private assertLockedFieldsUnchanged(
    tournament: Tournament,
    dto: UpdateTournamentDto,
  ): void {
    if (!TournamentStatusPolicy.isLocked(tournament.status)) return;
    const locked = this.lockedFieldsChanged(tournament, dto);
    if (locked.length > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede cambiar ${joinList(locked)} de un torneo en ` +
          `estado ${tournament.status}`,
      );
    }
  }

  // Campos bloqueados (nombre, deporte, fechas) que el DTO cambia de verdad.
  private lockedFieldsChanged(
    tournament: Tournament,
    dto: UpdateTournamentDto,
  ): string[] {
    const changed: string[] = [];
    if (dto.name !== undefined && dto.name !== tournament.name) {
      changed.push('el nombre');
    }
    if (dto.sportId !== undefined && dto.sportId !== tournament.sport.id) {
      changed.push('el deporte');
    }
    const datesChanged =
      (dto.startDate !== undefined && dto.startDate !== tournament.startDate) ||
      (dto.endDate !== undefined && dto.endDate !== tournament.endDate) ||
      (dto.registrationOpensAt !== undefined &&
        new Date(dto.registrationOpensAt).getTime() !==
          tournament.registrationOpensAt.getTime()) ||
      (dto.registrationClosesAt !== undefined &&
        new Date(dto.registrationClosesAt).getTime() !==
          tournament.registrationClosesAt.getTime());
    if (datesChanged) changed.push('las fechas');
    return changed;
  }
}
