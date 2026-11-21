import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';
import { Fan } from '../fans/entities/fan.entity';
import { FansService } from '../fans/fans.service';
import { Location } from '../locations/entities/location.entity';
import { LocationsService } from '../locations/locations.service';
import { LocationsRepository } from '../locations/repositories/locations.repository';
import { Match } from '../matches/entities/match.entity';
import { MatchesService } from '../matches/matches.service';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { TournamentStatusPolicy } from '../tournaments/policies/tournament-status.policy';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { MyTicketQueryDto } from './dto/my-ticket-query.dto';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { TicketAvailabilityQueryDto } from './dto/ticket-availability-query.dto';
import { MatchTicketAvailabilityResponseDto } from './dto/ticket-availability-response.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketMapper } from './mappers/ticket.mapper';
import { TicketRulesPolicy } from './policies/ticket-rules.policy';
import { TicketsRepository } from './repositories/tickets.repository';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly ticketsRepository: TicketsRepository,
    private readonly ticketMapper: TicketMapper,
    private readonly matchesService: MatchesService,
    private readonly locationsService: LocationsService,
    private readonly locationsRepository: LocationsRepository,
    private readonly fansService: FansService,
    private readonly dataSource: DataSource,
  ) {}

  async getAvailability(
    query: TicketAvailabilityQueryDto,
  ): Promise<MatchTicketAvailabilityResponseDto> {
    const match = await this.matchesService.getMatchOrFail(query.matchId);
    const [locations, soldByLocation] = await Promise.all([
      this.locationsRepository.findByFilters({
        venueId: match.venue.id,
        active: true,
      }),
      this.ticketsRepository.countByMatchGroupedByLocation(match.id),
    ]);

    return this.ticketMapper.toAvailabilityDto(match, locations, soldByLocation);
  }

  async findAll(query: TicketQueryDto): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketsRepository.findByFilters(query);
    return this.ticketMapper.toDtoList(tickets);
  }

  async findOne(id: number): Promise<TicketResponseDto> {
    const ticket = await this.getTicketOrFail(id);
    return this.ticketMapper.toDto(ticket);
  }

  async create(dto: CreateTicketDto): Promise<TicketResponseDto> {
    const fan = await this.fansService.getActiveFanOrFail(dto.fanId);
    return this.issueTicket(fan, dto.matchId, dto.locationId, dto.price);
  }

  async remove(id: number): Promise<{ message: string }> {
    const ticket = await this.getTicketOrFail(id);
    TicketRulesPolicy.assertTicketDeletable(ticket.match.status);
    await this.ticketRepository.remove(ticket);
    return { message: `Boleto ${ticket.code} eliminado correctamente` };
  }

  async findMine(
    user: AuthenticatedUser,
    query: MyTicketQueryDto,
  ): Promise<TicketResponseDto[]> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const tickets = await this.ticketsRepository.findByFilters({
      matchId: query.matchId,
      locationId: query.locationId,
      tournamentId: query.tournamentId,
      fanId: fan.id,
    });
    return this.ticketMapper.toDtoList(tickets);
  }

  async findOneMine(
    user: AuthenticatedUser,
    id: number,
  ): Promise<TicketResponseDto> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const ticket = await this.getTicketOrFail(id);
    this.assertOwnership(ticket, fan.id);
    return this.ticketMapper.toDto(ticket);
  }

  async purchaseMine(
    user: AuthenticatedUser,
    dto: PurchaseTicketDto,
  ): Promise<TicketResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    return this.issueTicket(fan, dto.matchId, dto.locationId, dto.price);
  }

  async removeMine(
    user: AuthenticatedUser,
    id: number,
  ): Promise<{ message: string }> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const ticket = await this.getTicketOrFail(id);
    this.assertOwnership(ticket, fan.id);
    TicketRulesPolicy.assertTicketDeletable(ticket.match.status);
    await this.ticketRepository.remove(ticket);
    return { message: `Boleto ${ticket.code} eliminado correctamente` };
  }

  private async issueTicket(
    fan: Fan,
    matchId: number,
    locationId: number,
    price?: number,
  ): Promise<TicketResponseDto> {
    const match = await this.matchesService.getMatchOrFail(matchId);
    if (TournamentStatusPolicy.isClosed(match.phase.tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El torneo ${match.phase.tournament.name} ya terminó o fue cancelado: no se pueden emitir boletos`,
      );
    }
    TicketRulesPolicy.assertMatchPurchasable(match.status);

    const location = await this.locationsService.getLocationOrFail(locationId);
    TicketRulesPolicy.assertLocationActive(location.active, location.name);
    TicketRulesPolicy.assertLocationBelongsToMatchVenue(
      location.venue.id,
      match.venue.id,
      location.name,
      match.venue.name,
    );

    const savedId = await this.dataSource.transaction(async (manager) => {
      // Bloqueo pesimista sobre la localidad sin joins para serializar la verificación de aforo.
      const lockedLocation = await manager.findOne(Location, {
        where: { id: locationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedLocation) {
        throw ResourceNotFoundException.of('Localidad', locationId);
      }
      TicketRulesPolicy.assertLocationActive(
        lockedLocation.active,
        lockedLocation.name,
      );

      const currentMatch = await manager.findOne(Match, {
        where: { id: matchId },
      });
      if (!currentMatch) {
        throw ResourceNotFoundException.of('Partido', matchId);
      }
      TicketRulesPolicy.assertMatchPurchasable(currentMatch.status);

      const existing = await this.ticketsRepository.findByMatchAndFan(
        matchId,
        fan.id,
        manager,
      );
      if (existing) {
        throw new ApplicationException(
          ErrorCase.ALREADY_EXISTS,
          'El aficionado ya tiene un boleto registrado para este partido',
        );
      }

      const sold = await this.ticketsRepository.countByMatchAndLocation(
        matchId,
        locationId,
        manager,
      );
      TicketRulesPolicy.assertCapacityAvailable(
        sold,
        lockedLocation.capacity,
        lockedLocation.name,
      );

      const entity = this.ticketMapper.toEntity(
        currentMatch,
        fan,
        lockedLocation,
        TicketRulesPolicy.generateCode(matchId, locationId),
        price,
      );
      const saved = await manager.save(Ticket, entity);
      return saved.id;
    });

    return this.findOne(savedId);
  }

  private async getTicketOrFail(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOneWithRelations(id);
    if (!ticket) {
      throw ResourceNotFoundException.of('Boleto', id);
    }
    return ticket;
  }

  private assertOwnership(ticket: Ticket, fanId: number): void {
    if (ticket.fan.id !== fanId) {
      throw new ApplicationException(
        ErrorCase.FORBIDDEN,
        'No tienes permiso para acceder o eliminar el boleto de otro aficionado',
      );
    }
  }
}
