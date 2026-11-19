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
import { PlayerSkillsService } from './player-skills.service';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { UpdatePlayerSkillDto } from './dto/update-player-skill.dto';
import { PlayerSkillQueryDto } from './dto/player-skill-query.dto';

@Controller('player-skills')
export class PlayerSkillsController {
  constructor(private readonly playerSkillsService: PlayerSkillsService) {}

  @Get()
  findAll(@Query() query: PlayerSkillQueryDto) {
    return this.playerSkillsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playerSkillsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlayerSkillDto) {
    return this.playerSkillsService.create(dto);
  }

  // Solo el nivel
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlayerSkillDto,
  ) {
    return this.playerSkillsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.playerSkillsService.remove(id);
  }
}
