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
import { GroupPhasesService } from '../services/group-phases.service';
import { CreateGroupPhaseDto } from '../dto/create-group-phase.dto';
import { UpdateGroupPhaseDto } from '../dto/update-group-phase.dto';
import { GroupPhaseQueryDto } from '../dto/group-phase-query.dto';
import { AssignGroupTeamDto } from '../dto/assign-group-team.dto';

@Controller('group-phases')
export class GroupPhasesController {
  constructor(private readonly groupPhasesService: GroupPhasesService) {}

  @Get()
  findAll(@Query() query: GroupPhaseQueryDto) {
    return this.groupPhasesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupPhasesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGroupPhaseDto) {
    return this.groupPhasesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupPhaseDto,
  ) {
    return this.groupPhasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupPhasesService.remove(id);
  }

  // ---- Equipos del grupo ----

  @Get(':id/teams')
  findTeams(@Param('id', ParseIntPipe) id: number) {
    return this.groupPhasesService.findTeams(id);
  }

  @Post(':id/teams')
  assignTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupTeamDto,
  ) {
    return this.groupPhasesService.assignTeam(id, dto);
  }

  @Delete(':id/teams/:teamId')
  removeTeam(
    @Param('id', ParseIntPipe) id: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ) {
    return this.groupPhasesService.removeTeam(id, teamId);
  }
}
