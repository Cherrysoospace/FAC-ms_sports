import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TournamentDevelopmentService } from './tournament-development.service';

// HU-GC-08b. /tournaments/:id/development no choca con /tournaments/:id
// (TournamentsController) porque tiene un segmento más.
@Controller('tournaments')
export class TournamentDevelopmentController {
  constructor(
    private readonly developmentService: TournamentDevelopmentService,
  ) {}

  @Get(':id/development')
  getDevelopment(@Param('id', ParseIntPipe) id: number) {
    return this.developmentService.getDevelopment(id);
  }
}
