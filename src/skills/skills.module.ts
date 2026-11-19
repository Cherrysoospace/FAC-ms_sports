import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { PlayerSkill } from '../player-skills/entities/player-skill.entity';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillsRepository } from './repositories/skills.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, PlayerSkill])],
  controllers: [SkillsController],
  providers: [SkillsService, SkillsRepository],
  // Lo usa Habilidad-Jugador (getSkillOrFail).
  exports: [SkillsService],
})
export class SkillsModule {}
