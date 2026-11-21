import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { RecordMatchResultDto } from './dto/record-match-result.dto';

// HU-GC-06 y resultado final PUT /matches/:id/result de HU-GC-07 (Fercho).
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  findAll(@Query() query: MatchQueryDto) {
    return this.matchesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.create(dto);
  }

  // Editar datos (solo programados) o cambiar el estado (iniciar o cancelar)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMatchDto) {
    return this.matchesService.update(id, dto);
  }

  // HU-GC-07: registra o corrige el marcador final (única vía que pasa el partido a FINISHED)
  @Put(':id/result')
  recordResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordMatchResultDto,
  ) {
    return this.matchesService.recordResult(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.remove(id);
  }
}
