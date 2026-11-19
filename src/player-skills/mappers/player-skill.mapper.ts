import { PlayerSkill } from '../entities/player-skill.entity';
import { Player } from '../../players/entities/player.entity';
import { Skill } from '../../skills/entities/skill.entity';
import {
  PlayerSkillPlayerDto,
  PlayerSkillResponseDto,
  PlayerSkillSkillDto,
} from '../dto/player-skill-response.dto';

export class PlayerSkillMapper {
  static toEntity(player: Player, skill: Skill, level: number): PlayerSkill {
    const entity = new PlayerSkill();
    entity.player = player;
    entity.skill = skill;
    entity.level = level;
    return entity;
  }

  // Requiere las relaciones player y skill cargadas.
  static toResponseDto(entity: PlayerSkill): PlayerSkillResponseDto {
    const player = new PlayerSkillPlayerDto();
    player.id = entity.player.id;
    player.fullName = entity.player.fullName;
    player.position = entity.player.position;

    const skill = new PlayerSkillSkillDto();
    skill.id = entity.skill.id;
    skill.name = entity.skill.name;
    skill.category = entity.skill.category;
    skill.description = entity.skill.description;

    const dto = new PlayerSkillResponseDto();
    dto.id = entity.id;
    dto.player = player;
    dto.skill = skill;
    dto.level = entity.level;
    return dto;
  }

  static toResponseDtoList(entities: PlayerSkill[]): PlayerSkillResponseDto[] {
    return entities.map((e) => PlayerSkillMapper.toResponseDto(e));
  }
}
