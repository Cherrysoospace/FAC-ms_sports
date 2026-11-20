import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** La ruta no pasa por el SecurityGuard (no exige token ni permiso). Solo GET /health. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
