import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { FansService } from './fans.service';
import { RegisterMyFanDto } from './dto/register-my-fan.dto';
import { UpdateMyFanDto } from './dto/update-my-fan.dto';

// Perfil propio del aficionado autenticado (claim `sub` del JWT).
@Controller('me/fan')
export class MeFanController {
  constructor(private readonly fansService: FansService) {}

  @Get()
  findMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.fansService.findMyProfile(user);
  }

  @Post()
  registerMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterMyFanDto,
  ) {
    return this.fansService.registerMyProfile(user, dto);
  }

  @Patch()
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyFanDto,
  ) {
    return this.fansService.updateMyProfile(user, dto);
  }
}
