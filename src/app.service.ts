import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: 'ms-sports';
}

@Injectable()
export class AppService {
  health(): HealthStatus {
    return { status: 'ok', service: 'ms-sports' };
  }
}
