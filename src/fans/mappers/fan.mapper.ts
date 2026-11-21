import { Injectable } from '@nestjs/common';
import { BaseMapper } from '../../common/mappers/base.mapper';
import { Fan } from '../entities/fan.entity';
import { FanResponseDto } from '../dto/fan-response.dto';
import { UpdateFanDto } from '../dto/update-fan.dto';
import { UpdateMyFanDto } from '../dto/update-my-fan.dto';

export interface FanCreateInput {
  securityUserId: number;
  fullName: string;
  documentNumber: string;
  email: string;
  phone?: string | null;
}

@Injectable()
export class FanMapper extends BaseMapper<Fan, FanResponseDto> {
  toDto(entity: Fan): FanResponseDto {
    return this.toDtoWithCount(entity, 0);
  }

  toDtoWithCount(entity: Fan, favoriteTeamsCount: number): FanResponseDto {
    const dto = new FanResponseDto();
    dto.id = entity.id;
    dto.securityUserId = entity.securityUserId;
    dto.fullName = entity.fullName;
    dto.documentNumber = entity.documentNumber;
    dto.email = entity.email;
    dto.phone = entity.phone ?? null;
    dto.active = entity.active;
    dto.createdAt = entity.createdAt;
    dto.favoriteTeamsCount = favoriteTeamsCount;
    return dto;
  }

  toDtoListWithCounts(
    entities: readonly Fan[],
    counts: ReadonlyMap<number, number>,
  ): FanResponseDto[] {
    return entities.map((fan) =>
      this.toDtoWithCount(fan, counts.get(fan.id) ?? 0),
    );
  }

  toEntity(input: FanCreateInput): Fan {
    const entity = new Fan();
    entity.securityUserId = input.securityUserId;
    entity.fullName = input.fullName;
    entity.documentNumber = input.documentNumber;
    entity.email = input.email;
    entity.phone = input.phone ? input.phone : null;
    entity.active = true;
    return entity;
  }

  mergeEntity(fan: Fan, dto: UpdateFanDto | UpdateMyFanDto): Fan {
    if (dto.fullName !== undefined) fan.fullName = dto.fullName;
    if (dto.documentNumber !== undefined) {
      fan.documentNumber = dto.documentNumber;
    }
    if (dto.email !== undefined) fan.email = dto.email;
    if (dto.phone !== undefined) fan.phone = dto.phone ? dto.phone : null;
    if ('active' in dto && dto.active !== undefined) fan.active = dto.active;
    return fan;
  }
}
