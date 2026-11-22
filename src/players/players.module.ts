import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { TeamPlayer } from '../team-players/entities/team-player.entity';
import { PlayerSkill } from '../player-skills/entities/player-skill.entity';
import { Goal } from '../goals/entities/goal.entity';
import { MatchPosition } from '../match-positions/entities/match-position.entity';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PlayersRepository } from './repositories/players.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Player,
      TeamPlayer,
      PlayerSkill,
      Goal,
      MatchPosition,
    ]),
  ],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository],
  // Lo usan Equipo-Jugador, Habilidad-Jugador y Anotación (getActivePlayerOrFail).
  exports: [PlayersService],
})
export class PlayersModule {}
