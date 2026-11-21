import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { FavoriteTeamsService } from './favorite-teams.service';
import { AddFavoriteTeamDto } from './dto/add-favorite-team.dto';

// Equipos favoritos del aficionado autenticado (R18).
@Controller('me/favorite-teams')
export class MeFavoriteTeamsController {
  constructor(private readonly favoriteTeamsService: FavoriteTeamsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.favoriteTeamsService.findBySecurityUser(user);
  }

  @Post()
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddFavoriteTeamDto,
  ) {
    return this.favoriteTeamsService.addFavorite(user, dto);
  }

  @Delete(':teamId')
  removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId', ParseIntPipe) teamId: number,
  ) {
    return this.favoriteTeamsService.removeFavorite(user, teamId);
  }
}
