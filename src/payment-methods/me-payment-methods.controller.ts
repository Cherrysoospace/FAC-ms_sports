import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { FanPaymentMethodsService } from './fan-payment-methods.service';
import { RegisterFanPaymentMethodDto } from './dto/register-fan-payment-method.dto';
import { UpdateFanPaymentMethodDto } from './dto/update-fan-payment-method.dto';
import { FanPaymentMethodQueryDto } from './dto/fan-payment-method-query.dto';

// Billetera de métodos de pago del aficionado autenticado (HU-GC-10).
@Controller('me/payment-methods')
export class MePaymentMethodsController {
  constructor(
    private readonly fanPaymentMethodsService: FanPaymentMethodsService,
  ) {}

  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FanPaymentMethodQueryDto,
  ) {
    return this.fanPaymentMethodsService.findMine(user, query);
  }

  @Get(':id')
  findOneMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.fanPaymentMethodsService.findOneMine(user, id);
  }

  @Post()
  registerMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterFanPaymentMethodDto,
  ) {
    return this.fanPaymentMethodsService.registerMine(user, dto);
  }

  @Patch(':id')
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFanPaymentMethodDto,
  ) {
    return this.fanPaymentMethodsService.updateMine(user, id, dto);
  }

  @Delete(':id')
  removeMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.fanPaymentMethodsService.removeMine(user, id);
  }
}

