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
import { TeamSportsService } from './team-sports.service';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportQueryDto } from './dto/team-sport-query.dto';

// Una asociación solo se crea o se retira: no hay PATCH.
@Controller('team-sports')
export class TeamSportsController {
  constructor(private readonly teamSportsService: TeamSportsService) {}

  @Get()
  findAll(@Query() query: TeamSportQueryDto) {
    return this.teamSportsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamSportsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTeamSportDto) {
    return this.teamSportsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teamSportsService.remove(id);
  }
}
