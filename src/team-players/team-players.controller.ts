import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TeamPlayersService } from './team-players.service';
import { CreateTeamPlayerDto } from './dto/create-team-player.dto';
import { UpdateTeamPlayerDto } from './dto/update-team-player.dto';
import { ReleaseTeamPlayerDto } from './dto/release-team-player.dto';
import { TeamPlayerQueryDto } from './dto/team-player-query.dto';

// No hay DELETE: el contrato se retira (release) y queda como historial.
@Controller('team-players')
export class TeamPlayersController {
  constructor(private readonly teamPlayersService: TeamPlayersService) {}

  @Get()
  findAll(@Query() query: TeamPlayerQueryDto) {
    return this.teamPlayersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamPlayersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTeamPlayerDto) {
    return this.teamPlayersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamPlayerDto,
  ) {
    return this.teamPlayersService.update(id, dto);
  }

  @Patch(':id/release')
  release(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReleaseTeamPlayerDto,
  ) {
    return this.teamPlayersService.release(id, dto);
  }
}
