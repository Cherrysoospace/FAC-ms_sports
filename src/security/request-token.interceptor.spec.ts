import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { defer, lastValueFrom } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { getCurrentRequestToken } from './request-token.context';
import { RequestTokenInterceptor } from './request-token.interceptor';

@Injectable()
class TokenEchoService {
  async readTokenAfterAwait(): Promise<string | null> {
    await Promise.resolve();
    return getCurrentRequestToken();
  }
}

@Controller('test-token')
class TokenEchoController {
  constructor(private readonly service: TokenEchoService) { }

  @Get()
  async getToken() {
    const token = await this.service.readTokenAfterAwait();
    return { token };
  }
}

function contextFor(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RequestTokenInterceptor', () => {
  const interceptor = new RequestTokenInterceptor();

  it('propaga el Bearer token dentro de handlers asíncronos', async () => {
    let tokenInsideAsync: string | null = null;
    const next: CallHandler = {
      handle: () =>
        defer(async () => {
          await Promise.resolve();
          tokenInsideAsync = getCurrentRequestToken();
          return 'ok';
        }),
    };

    const result = await lastValueFrom(
      interceptor.intercept(contextFor('Bearer jwt-123'), next),
    );

    expect(result).toBe('ok');
    expect(tokenInsideAsync).toBe('jwt-123');
    expect(getCurrentRequestToken()).toBeNull();
  });

  it('cuando no hay header Bearer devuelve null y continúa sin error', async () => {
    let tokenInsideAsync: string | null = 'algo';
    const next: CallHandler = {
      handle: () =>
        defer(async () => {
          await Promise.resolve();
          tokenInsideAsync = getCurrentRequestToken();
          return 'sin-token';
        }),
    };

    const result = await lastValueFrom(
      interceptor.intercept(contextFor(undefined), next),
    );

    expect(result).toBe('sin-token');
    expect(tokenInsideAsync).toBeNull();
  });

  it('mantiene el Bearer token a través de await en el pipeline HTTP real de NestJS/Express', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TokenEchoController],
      providers: [
        TokenEchoService,
        { provide: APP_INTERCEPTOR, useClass: RequestTokenInterceptor },
      ],
    }).compile();

    const app: INestApplication<App> = moduleRef.createNestApplication();
    await app.init();

    try {
      await request(app.getHttpServer())
        .get('/test-token')
        .set('Authorization', 'Bearer jwt-e2e')
        .expect(200)
        .expect({ token: 'jwt-e2e' });

      await request(app.getHttpServer())
        .get('/test-token')
        .expect(200)
        .expect({ token: null });
    } finally {
      await app.close();
    }
  });
});
