import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// Agrega un equipo favorito para el aficionado autenticado (POST /me/favorite-teams).
export class AddFavoriteTeamDto {
  @Type(() => Number)
  @Min(1, { message: 'El identificador del equipo no es válido' })
  @IsInt({ message: 'El equipo es obligatorio y debe ser un número entero' })
  teamId!: number;
}
