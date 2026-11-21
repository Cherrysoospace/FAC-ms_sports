import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// HU-GC-07: registra o corrige el marcador final de un partido.
export class RecordMatchResultDto {
  @Type(() => Number)
  @Min(0, { message: 'El marcador del equipo local no puede ser negativo' })
  @IsInt({
    message: 'El marcador del equipo local es obligatorio y debe ser entero',
  })
  homeScore!: number;

  @Type(() => Number)
  @Min(0, { message: 'El marcador del equipo visitante no puede ser negativo' })
  @IsInt({
    message:
      'El marcador del equipo visitante es obligatorio y debe ser entero',
  })
  awayScore!: number;
}
