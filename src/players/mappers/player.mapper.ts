import { Player } from '../entities/player.entity';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { PlayerResponseDto } from '../dto/player-response.dto';
import { PlayerAgePolicy } from '../policies/player-age.policy';

export class PlayerMapper {
  static toEntity(dto: CreatePlayerDto): Player {
    const entity = new Player();
    entity.fullName = dto.fullName;
    entity.documentNumber = dto.documentNumber;
    entity.birthDate = dto.birthDate;
    entity.nationality = dto.nationality;
    entity.position = dto.position;
    entity.heightCm = dto.heightCm;
    entity.dominantFoot = dto.dominantFoot ?? null;
    entity.active = true;
    return entity;
  }

  static mergeEntity(entity: Player, dto: UpdatePlayerDto): Player {
    if (dto.fullName !== undefined) entity.fullName = dto.fullName;
    if (dto.documentNumber !== undefined) {
      entity.documentNumber = dto.documentNumber;
    }
    if (dto.birthDate !== undefined) entity.birthDate = dto.birthDate;
    if (dto.nationality !== undefined) entity.nationality = dto.nationality;
    if (dto.position !== undefined) entity.position = dto.position;
    if (dto.heightCm !== undefined) entity.heightCm = dto.heightCm;
    if (dto.dominantFoot !== undefined) {
      entity.dominantFoot = dto.dominantFoot ?? null;
    }
    if (dto.active !== undefined) entity.active = dto.active;
    return entity;
  }

  static toResponseDto(entity: Player): PlayerResponseDto {
    const dto = new PlayerResponseDto();
    dto.id = entity.id;
    dto.fullName = entity.fullName;
    dto.documentNumber = entity.documentNumber;
    dto.birthDate = entity.birthDate;
    dto.age = PlayerAgePolicy.ageOn(entity.birthDate);
    dto.nationality = entity.nationality;
    dto.position = entity.position;
    dto.heightCm = entity.heightCm;
    dto.dominantFoot = entity.dominantFoot ?? null;
    dto.active = entity.active;
    return dto;
  }

  static toResponseDtoList(entities: Player[]): PlayerResponseDto[] {
    return entities.map((e) => PlayerMapper.toResponseDto(e));
  }
}
