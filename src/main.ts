import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestValidationException } from './common/exceptions';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas quedan bajo /gestion-deportiva para que los permisos
  // registrados en ms_security no se mezclen con los de otros microservicios.
  app.setGlobalPrefix('gestion-deportiva');

  // El frontend (Next.js) llama directamente a este microservicio.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        RequestValidationException.fromValidationErrors(errors),
    }),
  );

  // Mismo formato de errores que ms_security (ver GlobalExceptionHandler.java).
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
