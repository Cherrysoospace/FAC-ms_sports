import { Ball } from '../entities/ball.entity';
import { CreateBallDto } from '../dto/create-ball.dto';
import { UpdateBallDto } from '../dto/update-ball.dto';
import { BallResponseDto } from '../dto/ball-response.dto';

// La propiedad `size` de la entidad no admite null en su tipo (`?: string`),
// pero la columna sí es nullable; se usa un cast para no modificar la entidad.
export class BallMapper {
  static toEntity(dto: CreateBallDto): Ball {
    const entity = new Ball();
    entity.brand = dto.brand;
    entity.model = dto.model;
    entity.size = (dto.size ?? null) as string;
    entity.active = true;
    return entity;
  }

  static mergeEntity(entity: Ball, dto: UpdateBallDto): Ball {
    if (dto.brand !== undefined) entity.brand = dto.brand;
    if (dto.model !== undefined) entity.model = dto.model;
    if (dto.size !== undefined) entity.size = (dto.size ?? null) as string;
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  static toResponseDto(entity: Ball): BallResponseDto {
    const dto = new BallResponseDto();
    dto.id = entity.id;
    dto.brand = entity.brand;
    dto.model = entity.model;
    dto.size = entity.size ?? null;
    dto.active = entity.active;
    dto.matchId = entity.match?.id ?? null;
    return dto;
  }

  static toResponseDtoList(entities: Ball[]): BallResponseDto[] {
    return entities.map((e) => BallMapper.toResponseDto(e));
  }
}
