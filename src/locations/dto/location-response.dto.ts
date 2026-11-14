export class LocationVenueDto {
  id!: number;
  name!: string;
}

export class LocationResponseDto {
  id!: number;
  name!: string;
  capacity!: number;
  active!: boolean;
  venue!: LocationVenueDto;
}
