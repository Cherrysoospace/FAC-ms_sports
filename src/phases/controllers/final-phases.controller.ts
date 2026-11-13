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
import { FinalPhasesService } from '../services/final-phases.service';
import { CreateFinalPhaseDto } from '../dto/create-final-phase.dto';
import { UpdateFinalPhaseDto } from '../dto/update-final-phase.dto';
import { FinalPhaseQueryDto } from '../dto/final-phase-query.dto';

@Controller('final-phases')
export class FinalPhasesController {
  constructor(private readonly finalPhasesService: FinalPhasesService) {}

  @Get()
  findAll(@Query() query: FinalPhaseQueryDto) {
    return this.finalPhasesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.finalPhasesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFinalPhaseDto) {
    return this.finalPhasesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFinalPhaseDto,
  ) {
    return this.finalPhasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.finalPhasesService.remove(id);
  }
}
