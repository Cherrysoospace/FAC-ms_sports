/**
 * Mismos casos que ErrorCase.java de ms_security, para que el frontend
 * interprete igual los errores de ambos microservicios.
 */
export enum ErrorCase {
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}
