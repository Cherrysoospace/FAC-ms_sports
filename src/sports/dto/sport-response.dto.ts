export class SportSummaryDto {
  id!: number;
  name!: string;
  active!: boolean;
}

export class SportResponseDto {
  id!: number;
  name!: string;
  description!: string | null;
  active!: boolean;
  parent!: SportSummaryDto | null;
  // Solo cuando se cargó la relación
  subSports?: SportSummaryDto[];
}
