import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TeamModality } from '../enums/team-modality.enum';
import { TrimSpaces } from '../../common/validation';

export const TEAM_MODALITY_MESSAGE = `La modalidad debe ser una de: ${Object.values(TeamModality).join(', ')}`;

export class CreateTeamDto {
  @TrimSpaces()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  name!: string;

  @TrimSpaces()
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @MaxLength(80, { message: 'La ciudad no puede superar los 80 caracteres' })
  city!: string;

  @IsEnum(TeamModality, { message: TEAM_MODALITY_MESSAGE })
  modality!: TeamModality;
}
