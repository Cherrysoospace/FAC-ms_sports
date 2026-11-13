import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ball } from './entities/ball.entity';
import { Match } from '../matches/entities/match.entity';
import { BallsController } from './balls.controller';
import { BallsService } from './balls.service';
import { BallsRepository } from './repositories/balls.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Ball, Match])],
  controllers: [BallsController],
  providers: [BallsService, BallsRepository],
  // Lo usa el módulo de Partido para validar que la pelota esté disponible.
  exports: [BallsService],
})
export class BallsModule {}
