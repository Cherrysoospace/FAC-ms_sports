import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { TicketsService } from './tickets.service';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { MyTicketQueryDto } from './dto/my-ticket-query.dto';

// Compra y consulta de boletos del aficionado autenticado.
@Controller('me/tickets')
export class MeTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyTicketQueryDto,
  ) {
    return this.ticketsService.findMine(user, query);
  }

  @Get(':id')
  findOneMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.findOneMine(user, id);
  }

  @Post()
  purchaseMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchaseTicketDto,
  ) {
    return this.ticketsService.purchaseMine(user, dto);
  }

  @Delete(':id')
  removeMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.removeMine(user, id);
  }
}

