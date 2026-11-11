import { ErrorCase } from './error-case.enum';

/**
 * Equivalente a ApplicationException.java: error de negocio con un caso
 * que el GlobalExceptionFilter traduce a un estado HTTP.
 *
 * Uso: throw new ApplicationException(ErrorCase.ALREADY_EXISTS, 'Ya existe un deporte con ese nombre');
 */
export class ApplicationException extends Error {
  constructor(
    public readonly errorCase: ErrorCase,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationException';
  }
}
