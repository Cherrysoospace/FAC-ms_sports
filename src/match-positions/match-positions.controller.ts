import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MatchPositionsService } from './match-positions.service';
import { RecordPositionsDto } from './dto/record-positions.dto';
import { PositionQueryDto } from './dto/position-query.dto';

// HU-GC-09: lo alimenta el script simulador y lo consulta la pizarra.
@Controller('match-positions')
export class MatchPositionsController {
  constructor(private readonly matchPositionsService: MatchPositionsService) {}

  // Pizarra: última posición de cada participante y de la pelota
  @Get()
  board(@Query() query: PositionQueryDto) {
    return this.matchPositionsService.board(query.matchId);
  }

  // Una "foto" del campo (varias posiciones con la misma hora)
  @Post()
  record(@Body() dto: RecordPositionsDto) {
    return this.matchPositionsService.record(dto);
  }
}
