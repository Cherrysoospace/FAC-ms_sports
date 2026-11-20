import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { HealthStatus } from './app.service';
import { Public } from './security/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Única ruta pública: no pasa por el SecurityGuard
  @Public()
  @Get('health')
  health(): HealthStatus {
    return this.appService.health();
  }
}
