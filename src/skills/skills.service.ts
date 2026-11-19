import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { SkillsRepository } from './repositories/skills.repository';
import { SkillMapper } from './mappers/skill.mapper';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { SkillResponseDto } from './dto/skill-response.dto';
import { formatCount } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    private readonly skillsRepository: SkillsRepository,
  ) {}

  async findAll(query: SkillQueryDto): Promise<SkillResponseDto[]> {
    const skills = await this.skillsRepository.findByFilters(query);
    return SkillMapper.toResponseDtoList(skills);
  }

  async findOne(id: number): Promise<SkillResponseDto> {
    return SkillMapper.toResponseDto(await this.getSkillOrFail(id));
  }

  // Lo usa Habilidad-Jugador para validar que la habilidad exista.
  async getSkillOrFail(id: number): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) throw ResourceNotFoundException.of('Habilidad', id);
    return skill;
  }

  async create(dto: CreateSkillDto): Promise<SkillResponseDto> {
    await this.assertNameAvailable(dto.name);
    const saved = await this.skillRepository.save(SkillMapper.toEntity(dto));
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateSkillDto): Promise<SkillResponseDto> {
    const skill = await this.getSkillOrFail(id);

    if (dto.name !== undefined && dto.name !== skill.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    await this.skillRepository.save(SkillMapper.mergeEntity(skill, dto));
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const skill = await this.getSkillOrFail(id);

    const players = await this.skillsRepository.countPlayers(id);
    if (players > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar '${skill.name}' porque está asignada a ` +
          `${formatCount(players, 'jugador', 'jugadores')}. Retírela primero ` +
          'de sus habilidades',
      );
    }

    await this.skillRepository.remove(skill);
    return { message: `Habilidad #${id} eliminada correctamente` };
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.skillsRepository.findByNameIgnoringCase(
      name,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe una habilidad con el nombre "${name}"`,
      );
    }
  }
}
