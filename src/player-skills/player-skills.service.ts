import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerSkill } from './entities/player-skill.entity';
import { PlayerSkillsRepository } from './repositories/player-skills.repository';
import { PlayerSkillMapper } from './mappers/player-skill.mapper';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { UpdatePlayerSkillDto } from './dto/update-player-skill.dto';
import { PlayerSkillQueryDto } from './dto/player-skill-query.dto';
import { PlayerSkillResponseDto } from './dto/player-skill-response.dto';
import { PlayersService } from '../players/players.service';
import { SkillsService } from '../skills/skills.service';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class PlayerSkillsService {
  constructor(
    @InjectRepository(PlayerSkill)
    private readonly playerSkillRepository: Repository<PlayerSkill>,
    private readonly playerSkillsRepository: PlayerSkillsRepository,
    private readonly playersService: PlayersService,
    private readonly skillsService: SkillsService,
  ) {}

  // ?playerId → habilidades del jugador; ?skillId → jugadores con la habilidad.
  async findAll(query: PlayerSkillQueryDto): Promise<PlayerSkillResponseDto[]> {
    const associations = await this.playerSkillsRepository.findByFilters(query);
    return PlayerSkillMapper.toResponseDtoList(associations);
  }

  async findOne(id: number): Promise<PlayerSkillResponseDto> {
    return PlayerSkillMapper.toResponseDto(await this.getPlayerSkillOrFail(id));
  }

  async create(dto: CreatePlayerSkillDto): Promise<PlayerSkillResponseDto> {
    const player = await this.playersService.getActivePlayerOrFail(
      dto.playerId,
    );
    const skill = await this.skillsService.getSkillOrFail(dto.skillId);

    if (
      await this.playerSkillsRepository.existsAssociation(player.id, skill.id)
    ) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `La habilidad ${skill.name} ya se encuentra asignada a ${player.fullName}`,
      );
    }

    const saved = await this.playerSkillRepository.save(
      PlayerSkillMapper.toEntity(player, skill, dto.level),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdatePlayerSkillDto,
  ): Promise<PlayerSkillResponseDto> {
    const association = await this.getPlayerSkillOrFail(id);
    association.level = dto.level;
    await this.playerSkillRepository.save(association);
    return this.findOne(id);
  }

  // Retira solo la asociación: la habilidad sigue en el catálogo.
  async remove(id: number): Promise<{ message: string }> {
    const association = await this.getPlayerSkillOrFail(id);
    const { player, skill } = association;
    await this.playerSkillRepository.remove(association);
    return {
      message: `Se retiró ${skill.name} de las habilidades de ${player.fullName}`,
    };
  }

  private async getPlayerSkillOrFail(id: number): Promise<PlayerSkill> {
    const association = await this.playerSkillRepository.findOne({
      where: { id },
      relations: { player: true, skill: true },
    });
    if (!association) {
      throw ResourceNotFoundException.of('Asociación habilidad-jugador', id);
    }
    return association;
  }
}
