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
import { CurrentUser } from '../security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { BetsService } from './bets.service';
import { CancelBetDto } from './dto/cancel-bet.dto';
import { MyBetQueryDto } from './dto/my-bet-query.dto';
import { PlaceBetDto } from './dto/place-bet.dto';
import { UpdateMyBetDto } from './dto/update-my-bet.dto';

// Registro, consulta, edición previa y cancelación de apuestas del aficionado autenticado.
@Controller('me/bets')
export class MeBetsController {
  constructor(private readonly betsService: BetsService) {}

  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyBetQueryDto,
  ) {
    return this.betsService.findMine(user, query);
  }

  @Get(':id')
  findOneMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.betsService.findOneMine(user, id);
  }

  @Post()
  placeMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PlaceBetDto,
  ) {
    return this.betsService.placeMine(user, dto);
  }

  @Patch(':id')
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMyBetDto,
  ) {
    return this.betsService.updateMine(user, id, dto);
  }

  @Patch(':id/cancel')
  cancelMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelBetDto,
  ) {
    return this.betsService.cancelMine(user, id, dto);
  }
}
