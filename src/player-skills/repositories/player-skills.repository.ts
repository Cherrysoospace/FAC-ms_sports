import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerSkill } from '../entities/player-skill.entity';
import { PlayerSkillQueryDto } from '../dto/player-skill-query.dto';

// Consultas propias del módulo habilidad-jugador.
@Injectable()
export class PlayerSkillsRepository {
  constructor(
    @InjectRepository(PlayerSkill)
    private readonly playerSkillRepository: Repository<PlayerSkill>,
  ) {}

  findByFilters(query: PlayerSkillQueryDto): Promise<PlayerSkill[]> {
    const qb = this.playerSkillRepository
      .createQueryBuilder('playerSkill')
      .innerJoinAndSelect('playerSkill.player', 'player')
      .innerJoinAndSelect('playerSkill.skill', 'skill')
      .orderBy('playerSkill.level', 'DESC')
      .addOrderBy('skill.name', 'ASC')
      .addOrderBy('player.fullName', 'ASC');

    if (query.playerId !== undefined) {
      qb.andWhere('player.id = :playerId', { playerId: query.playerId });
    }
    if (query.skillId !== undefined) {
      qb.andWhere('skill.id = :skillId', { skillId: query.skillId });
    }

    return qb.getMany();
  }

  existsAssociation(playerId: number, skillId: number): Promise<boolean> {
    return this.playerSkillRepository.exists({
      where: { player: { id: playerId }, skill: { id: skillId } },
    });
  }
}
