import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionValidationClient } from './permission-validation.client';
import { SecurityGuard } from './security.guard';

// Protege todas las rutas con ms_security. Las públicas se marcan con @Public().
@Module({
  providers: [
    PermissionValidationClient,
    { provide: APP_GUARD, useClass: SecurityGuard },
  ],
})
export class SecurityModule {}
