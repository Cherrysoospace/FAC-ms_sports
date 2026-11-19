import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PlayerProfilesService } from './player-profiles.service';

// GET /players/:id/profile (HU-GD-08)
@Controller('players/:id/profile')
export class PlayerProfilesController {
  constructor(private readonly playerProfilesService: PlayerProfilesService) {}

  @Get()
  getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.playerProfilesService.getProfile(id);
  }
}
