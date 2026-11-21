import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BetsService } from './bets.service';
import { AvailableBetMatchesQueryDto } from './dto/available-bet-matches-query.dto';
import { BetQueryDto } from './dto/bet-query.dto';
import { CancelBetDto } from './dto/cancel-bet.dto';
import { CreateBetDto } from './dto/create-bet.dto';

// Gestión administrativa y consulta de partidos disponibles para apostar (HU-GC-11).
@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  // Ruta fija declarada antes de :id para evitar colisiones de enrutamiento.
  @Get('available-matches')
  findAvailableMatches(@Query() query: AvailableBetMatchesQueryDto) {
    return this.betsService.findAvailableMatches(query);
  }

  @Get()
  findAll(@Query() query: BetQueryDto) {
    return this.betsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.betsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBetDto) {
    return this.betsService.create(dto);
  }

  @Patch(':id/void')
  voidBet(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelBetDto) {
    return this.betsService.voidBet(id, dto);
  }
}
