import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PermissionValidationClient } from './permission-validation.client';
import { RequestTokenInterceptor } from './request-token.interceptor';
import { SecurityGuard } from './security.guard';

// Protege todas las rutas con ms_security. Las públicas se marcan con @Public().
@Module({
  providers: [
    PermissionValidationClient,
    { provide: APP_GUARD, useClass: SecurityGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestTokenInterceptor },
  ],
})
export class SecurityModule {}
