import { DominantFoot } from '../enums/dominant-foot.enum';

export class PlayerResponseDto {
  id!: number;
  fullName!: string;
  documentNumber!: string;
  // 'YYYY-MM-DD'
  birthDate!: string;
  // Calculada a partir de birthDate
  age!: number;
  nationality!: string;
  position!: string;
  heightCm!: number;
  dominantFoot!: DominantFoot | null;
  active!: boolean;
}
