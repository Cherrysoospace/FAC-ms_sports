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
import { FansService } from './fans.service';
import { CreateFanDto } from './dto/create-fan.dto';
import { UpdateFanDto } from './dto/update-fan.dto';
import { FanQueryDto } from './dto/fan-query.dto';

// Gestión administrativa de aficionados (Fercho).
@Controller('fans')
export class FansController {
  constructor(private readonly fansService: FansService) {}

  @Get()
  findAll(@Query() query: FanQueryDto) {
    return this.fansService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fansService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFanDto) {
    return this.fansService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFanDto) {
    return this.fansService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fansService.remove(id);
  }
}

