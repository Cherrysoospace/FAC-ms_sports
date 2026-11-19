import { Team } from '../../teams/entities/team.entity';
import { RelatedTeamResponseDto } from '../dto/related-team-response.dto';

export class RelatedTeamMapper {
  static toResponseDto(entity: Team): RelatedTeamResponseDto {
    const dto = new RelatedTeamResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.city = entity.city;
    dto.modality = entity.modality;
    dto.active = entity.active;
    return dto;
  }

  static toResponseDtoList(entities: Team[]): RelatedTeamResponseDto[] {
    return entities.map((e) => RelatedTeamMapper.toResponseDto(e));
  }
}
