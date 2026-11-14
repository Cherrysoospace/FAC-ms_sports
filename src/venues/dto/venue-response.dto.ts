export class VenueParentDto {
  id!: number;
  name!: string;
}

export class VenueChildDto {
  id!: number;
  name!: string;
  active!: boolean;
}

export class VenueResponseDto {
  id!: number;
  name!: string;
  address!: string | null;
  active!: boolean;
  parent!: VenueParentDto | null;
  // Solo cuando se cargó la relación (GET /venues/:id)
  children?: VenueChildDto[];
  // Localidades del escenario (activas e inactivas)
  locationsCount!: number;
  // Suma de la capacidad de las localidades activas
  totalCapacity!: number;
}
