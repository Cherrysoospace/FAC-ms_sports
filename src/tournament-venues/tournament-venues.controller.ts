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
import { TournamentVenuesService } from './tournament-venues.service';
import { CreateTournamentVenueDto } from './dto/create-tournament-venue.dto';
import { TournamentVenueQueryDto } from './dto/tournament-venue-query.dto';

// Una asociación solo se crea o se retira: no hay PATCH.
@Controller('tournament-venues')
export class TournamentVenuesController {
  constructor(
    private readonly tournamentVenuesService: TournamentVenuesService,
  ) {}

  @Get()
  findAll(@Query() query: TournamentVenueQueryDto) {
    return this.tournamentVenuesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentVenuesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTournamentVenueDto) {
    return this.tournamentVenuesService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentVenuesService.remove(id);
  }
}
