import { MatchStatus } from '../../matches/enums/match-status.enum';

export class LocationAvailabilityDto {
  locationId!: number;
  locationName!: string;
  active!: boolean;
  capacity!: number;
  sold!: number;
  available!: number;
  soldOut!: boolean;
}

export class MatchTicketAvailabilityResponseDto {
  matchId!: number;
  matchStatus!: MatchStatus;
  scheduledAt!: Date;
  venueId!: number;
  venueName!: string;
  totalCapacity!: number;
  totalSold!: number;
  totalAvailable!: number;
  locations!: LocationAvailabilityDto[];
}

