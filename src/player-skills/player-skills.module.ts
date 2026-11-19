import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerSkill } from './entities/player-skill.entity';
import { PlayersModule } from '../players/players.module';
import { SkillsModule } from '../skills/skills.module';
import { PlayerSkillsController } from './player-skills.controller';
import { PlayerSkillsService } from './player-skills.service';
import { PlayerSkillsRepository } from './repositories/player-skills.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerSkill]),
    PlayersModule,
    SkillsModule,
  ],
  controllers: [PlayerSkillsController],
  providers: [PlayerSkillsService, PlayerSkillsRepository],
  // Lo usa el perfil del jugador (findAll por jugador).
  exports: [PlayerSkillsService],
})
export class PlayerSkillsModule {}
