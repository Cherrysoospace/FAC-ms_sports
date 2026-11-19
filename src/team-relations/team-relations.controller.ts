import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { TeamRelationsService } from './team-relations.service';
import { CreateTeamRelationDto } from './dto/create-team-relation.dto';

// Rutas anidadas del equipo: /teams/:id/related-teams
@Controller('teams/:id/related-teams')
export class TeamRelationsController {
  constructor(private readonly teamRelationsService: TeamRelationsService) {}

  @Get()
  findRelated(@Param('id', ParseIntPipe) id: number) {
    return this.teamRelationsService.findRelated(id);
  }

  @Post()
  relate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTeamRelationDto,
  ) {
    return this.teamRelationsService.relate(id, dto);
  }

  @Delete(':relatedTeamId')
  unrelate(
    @Param('id', ParseIntPipe) id: number,
    @Param('relatedTeamId', ParseIntPipe) relatedTeamId: number,
  ) {
    return this.teamRelationsService.unrelate(id, relatedTeamId);
  }
}
