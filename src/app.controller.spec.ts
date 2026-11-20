import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IS_PUBLIC_KEY } from './security/decorators/public.decorator';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('GET /health responde ok', () => {
    expect(appController.health()).toEqual({
      status: 'ok',
      service: 'ms-sports',
    });
  });

  it('GET /health es pública (@Public)', () => {
    const handler = Object.getOwnPropertyDescriptor(
      AppController.prototype,
      'health',
    )?.value as () => unknown;
    const isPublic = new Reflector().get<boolean>(IS_PUBLIC_KEY, handler);
    expect(isPublic).toBe(true);
  });
});
