import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { Fan } from '../../fans/entities/fan.entity';
import { Location } from '../../locations/entities/location.entity';
import { Match } from '../../matches/entities/match.entity';
import { Ticket } from '../entities/ticket.entity';
import {
  LocationAvailabilityDto,
  MatchTicketAvailabilityResponseDto,
} from '../dto/ticket-availability-response.dto';
import {
  TicketFanSummaryDto,
  TicketLocationSummaryDto,
  TicketMatchSummaryDto,
  TicketResponseDto,
} from '../dto/ticket-response.dto';

@Injectable()
export class TicketMapper extends BaseMapper<Ticket, TicketResponseDto> {
  toDto(entity: Ticket): TicketResponseDto {
    const dto = new TicketResponseDto();
    dto.id = entity.id;
    dto.code = entity.code;
    dto.price = Number(entity.price);
    dto.purchasedAt = entity.purchasedAt;
    dto.match = this.toMatchSummaryDto(entity.match);
    dto.location = this.toLocationSummaryDto(entity.location);
    dto.fan = this.toFanSummaryDto(entity.fan);
    return dto;
  }

  toEntity(
    match: Match,
    fan: Fan,
    location: Location,
    code: string,
    price?: number,
  ): Ticket {
    const entity = new Ticket();
    entity.match = match;
    entity.fan = fan;
    entity.location = location;
    entity.code = code;
    entity.price = (price ?? 0).toFixed(2);
    return entity;
  }

  toAvailabilityDto(
    match: Match,
    locations: Location[],
    soldByLocation: Map<number, number>,
  ): MatchTicketAvailabilityResponseDto {
    let totalCapacity = 0;
    let totalSold = 0;

    const locationDtos = locations.map((location) => {
      const sold = soldByLocation.get(location.id) ?? 0;
      const available = Math.max(location.capacity - sold, 0);
      totalCapacity += location.capacity;
      totalSold += sold;

      const item = new LocationAvailabilityDto();
      item.locationId = location.id;
      item.locationName = location.name;
      item.active = location.active;
      item.capacity = location.capacity;
      item.sold = sold;
      item.available = available;
      item.soldOut = available === 0;
      return item;
    });

    const response = new MatchTicketAvailabilityResponseDto();
    response.matchId = match.id;
    response.matchStatus = match.status;
    response.scheduledAt = match.scheduledAt;
    response.venueId = match.venue.id;
    response.venueName = match.venue.name;
    response.totalCapacity = totalCapacity;
    response.totalSold = totalSold;
    response.totalAvailable = Math.max(totalCapacity - totalSold, 0);
    response.locations = locationDtos;
    return response;
  }

  private toMatchSummaryDto(match: Match): TicketMatchSummaryDto {
    const dto = new TicketMatchSummaryDto();
    dto.id = match.id;
    dto.scheduledAt = match.scheduledAt;
    dto.status = match.status;
    dto.homeTeamName = match.homeTeam.name;
    dto.awayTeamName = match.awayTeam.name;
    dto.venueId = match.venue.id;
    dto.venueName = match.venue.name;
    return dto;
  }

  private toLocationSummaryDto(location: Location): TicketLocationSummaryDto {
    const dto = new TicketLocationSummaryDto();
    dto.id = location.id;
    dto.name = location.name;
    dto.capacity = location.capacity;
    return dto;
  }

  private toFanSummaryDto(fan: Fan): TicketFanSummaryDto {
    const dto = new TicketFanSummaryDto();
    dto.id = fan.id;
    dto.fullName = fan.fullName;
    dto.documentNumber = fan.documentNumber;
    dto.email = fan.email;
    return dto;
  }
}
