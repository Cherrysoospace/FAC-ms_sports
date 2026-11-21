import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedRequest } from './authenticated-user';
import { extractBearerToken } from './request-credentials';
import { runWithRequestToken } from './request-token.context';

/**
 * Propaga el Bearer token del usuario autenticado durante toda la ejecución
 * asíncrona del handler HTTP mediante AsyncLocalStorage.
 */
@Injectable()
export class RequestTokenInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request?.headers?.authorization);
    if (!token) {
      return next.handle();
    }

    return new Observable((subscriber) =>
      runWithRequestToken(token, () => {
        const subscription = next.handle().subscribe(subscriber);
        return () => subscription.unsubscribe();
      }),
    );
  }
}
