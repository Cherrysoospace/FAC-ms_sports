import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PlayersRepository } from './repositories/players.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository],
  // Lo usan Equipo-Jugador, Habilidad-Jugador y Anotación (getActivePlayerOrFail).
  exports: [PlayersService],
})
export class PlayersModule {}
