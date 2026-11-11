import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import {
  ApplicationException,
  ErrorCase,
  RequestValidationException,
} from '../exceptions';

const STATUS_BY_ERROR_CASE: Record<ErrorCase, HttpStatus> = {
  [ErrorCase.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCase.ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCase.INVALID_OPERATION]: HttpStatus.BAD_REQUEST,
  [ErrorCase.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCase.FORBIDDEN]: HttpStatus.FORBIDDEN,
};

/**
 * Imita GlobalExceptionHandler.java de ms_security. Mismos cuerpos de respuesta:
 * - ApplicationException  -> { errorCase, message }
 * - Validación de DTO     -> { campo: mensaje, ... } (400)
 * - HttpException de Nest -> { errorCase: 'HTTP_ERROR', message } (incluye 401/403/503 del guard)
 * - Cualquier otro error  -> 500 { errorCase: 'INTERNAL_ERROR', message, errorId, path }
 * Adicional: duplicados y llaves foráneas de MySQL se responden como 409.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    if (exception instanceof ApplicationException) {
      response.status(STATUS_BY_ERROR_CASE[exception.errorCase]).json({
        errorCase: exception.errorCase,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof RequestValidationException) {
      response.status(HttpStatus.BAD_REQUEST).json(exception.fieldErrors);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        const errorId = randomUUID();
        this.logger.error(
          `Error HTTP ${status} [${errorId}] en ${request.method} ${request.originalUrl}`,
          exception.stack,
        );
      }
      response.status(status).json({
        errorCase: 'HTTP_ERROR',
        message: this.extractMessage(exception),
      });
      return;
    }

    const databaseError = this.translateDatabaseError(exception);
    if (databaseError) {
      response.status(HttpStatus.CONFLICT).json(databaseError);
      return;
    }

    const errorId = randomUUID();
    const type = exception instanceof Error ? exception.name : typeof exception;
    this.logger.error(
      `Error inesperado [${errorId}] en ${request.method} ${request.originalUrl}. Tipo: ${type}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      errorCase: 'INTERNAL_ERROR',
      message:
        'Error interno del servidor. Consulta los logs con el identificador proporcionado.',
      errorId,
      path: request.originalUrl,
    });
  }

  private extractMessage(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (Array.isArray(message)) return message.join(' ');
      if (typeof message === 'string') return message;
    }
    return exception.message;
  }

  /** Red de seguridad: los servicios deben validar antes, pero si MySQL rechaza, no es un 500. */
  private translateDatabaseError(
    exception: unknown,
  ): { errorCase: string; message: string } | null {
    if (!(exception instanceof QueryFailedError)) return null;
    const code = (exception.driverError as { code?: string } | undefined)?.code;

    if (code === 'ER_DUP_ENTRY') {
      return {
        errorCase: ErrorCase.ALREADY_EXISTS,
        message: 'Ya existe un registro con esos datos',
      };
    }
    if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
      return {
        errorCase: 'HTTP_ERROR',
        message: 'No se puede eliminar porque tiene información asociada',
      };
    }
    if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
      return {
        errorCase: ErrorCase.NOT_FOUND,
        message: 'Uno de los registros relacionados no existe',
      };
    }
    return null;
  }
}
