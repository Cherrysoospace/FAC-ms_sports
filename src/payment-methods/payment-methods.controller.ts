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
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodQueryDto } from './dto/payment-method-query.dto';

// Catálogo administrativo de métodos de pago (HU-GC-10).
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll(@Query() query: PaymentMethodQueryDto) {
    return this.paymentMethodsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodsService.remove(id);
  }
}
