import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { Sport } from '../sports/entities/sport.entity';
import { TournamentStatus } from './enums/tournament-status.enum';
import { TournamentsRepository } from './repositories/tournaments.repository';
import { TournamentMapper } from './mappers/tournament.mapper';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

// Transiciones de estado permitidas: solo se avanza, y se puede cancelar
// desde cualquier estado salvo FINISHED.
const ALLOWED_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.PLANNED]: [
    TournamentStatus.REGISTRATION_OPEN,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.REGISTRATION_OPEN]: [
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.IN_PROGRESS]: [
    TournamentStatus.FINISHED,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.FINISHED]: [],
  [TournamentStatus.CANCELLED]: [],
};

// En estos estados ya no se pueden cambiar nombre, deporte ni fechas.
const LOCKED_STATUSES: TournamentStatus[] = [
  TournamentStatus.IN_PROGRESS,
  TournamentStatus.FINISHED,
  TournamentStatus.CANCELLED,
];

const MIN_REGISTRATIONS_TO_START = 2;

interface TournamentDates {
  startDate: string;
  endDate: string;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
}

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
    private readonly tournamentsRepository: TournamentsRepository,
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
    this.assertValidDates({
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
    const currentStatus = tournament.status;

    // e) Torneo iniciado, finalizado o cancelado: solo status y active.
    if (LOCKED_STATUSES.includes(currentStatus)) {
      const locked = this.lockedFieldsChanged(tournament, dto);
      if (locked.length > 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `No se puede cambiar ${this.joinList(locked)} de un torneo en ` +
            `estado ${currentStatus}`,
        );
      }
    }

    // a) Deporte: solo se valida si cambia.
    const sportChanges =
      dto.sportId !== undefined && dto.sportId !== tournament.sport.id;
    let newSport: Sport | undefined;
    if (sportChanges && dto.sportId !== undefined) {
      const [registrations, phases] = await Promise.all([
        this.tournamentsRepository.countRegistrations(id),
        this.tournamentsRepository.countPhases(id),
      ]);
      const dependencies = [
        this.plural(registrations, 'inscripción', 'inscripciones'),
        this.plural(phases, 'fase', 'fases'),
      ].filter((d): d is string => d !== null);
      if (dependencies.length > 0) {
        throw new BusinessRuleException(
          'No se puede cambiar el deporte porque el torneo ya tiene ' +
            this.joinList(dependencies),
        );
      }
      newSport = await this.getActiveSport(dto.sportId);
    }

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
    if (
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.registrationOpensAt !== undefined ||
      dto.registrationClosesAt !== undefined
    ) {
      this.assertValidDates({
        startDate: dto.startDate ?? tournament.startDate,
        endDate: dto.endDate ?? tournament.endDate,
        registrationOpensAt:
          dto.registrationOpensAt !== undefined
            ? new Date(dto.registrationOpensAt)
            : tournament.registrationOpensAt,
        registrationClosesAt:
          dto.registrationClosesAt !== undefined
            ? new Date(dto.registrationClosesAt)
            : tournament.registrationClosesAt,
      });
    }

    // d) Estado.
    if (dto.status !== undefined && dto.status !== currentStatus) {
      await this.assertStatusTransition(id, currentStatus, dto.status);
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
      this.plural(phases, 'fase', 'fases'),
      this.plural(registrations, 'inscripción', 'inscripciones'),
      this.plural(venues, 'escenario', 'escenarios'),
    ].filter((d): d is string => d !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar porque tiene ${this.joinList(dependencies)} ` +
          'asociados. Cámbielo a CANCELLED o desactívelo con ' +
          'PATCH { "active": false }',
      );
    }

    await this.tournamentRepository.remove(tournament);
    return { message: `Torneo #${id} eliminado correctamente` };
  }

  private async getActiveSport(sportId: number): Promise<Sport> {
    const sport = await this.sportRepository.findOne({
      where: { id: sportId },
    });
    if (!sport) throw ResourceNotFoundException.of('Deporte', sportId);
    if (!sport.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El deporte está inactivo',
      );
    }
    return sport;
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

  private assertValidDates(dates: TournamentDates): void {
    if (
      dates.registrationOpensAt.getTime() >=
      dates.registrationClosesAt.getTime()
    ) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La apertura de inscripciones debe ser anterior a su cierre',
      );
    }
    if (this.toDateOnly(dates.registrationClosesAt) > dates.startDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El cierre de inscripciones debe ser el mismo día o antes de la ' +
          'fecha de inicio del torneo',
      );
    }
    // Las fechas YYYY-MM-DD se pueden comparar como texto.
    if (dates.startDate > dates.endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La fecha de inicio debe ser igual o anterior a la fecha de fin',
      );
    }
  }

  private async assertStatusTransition(
    id: number,
    from: TournamentStatus,
    to: TournamentStatus,
  ): Promise<void> {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede pasar de ${from} a ${to}`,
      );
    }
    if (to === TournamentStatus.IN_PROGRESS) {
      const active =
        await this.tournamentsRepository.countActiveRegistrations(id);
      if (active < MIN_REGISTRATIONS_TO_START) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `Para iniciar el torneo se necesitan al menos ` +
            `${MIN_REGISTRATIONS_TO_START} inscripciones activas ` +
            `(tiene ${active})`,
        );
      }
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

  // Fecha local YYYY-MM-DD de un datetime (misma zona con que se guarda).
  private toDateOnly(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private plural(count: number, singular: string, pluralForm: string) {
    if (count === 0) return null;
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }

  private joinList(items: string[]): string {
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  }
}
