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
import { BallsService } from './balls.service';
import { CreateBallDto } from './dto/create-ball.dto';
import { UpdateBallDto } from './dto/update-ball.dto';
import { BallQueryDto } from './dto/ball-query.dto';

@Controller('balls')
export class BallsController {
  constructor(private readonly ballsService: BallsService) {}

  @Get()
  findAll(@Query() query: BallQueryDto) {
    return this.ballsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ballsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBallDto) {
    return this.ballsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBallDto) {
    return this.ballsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ballsService.remove(id);
  }
}
