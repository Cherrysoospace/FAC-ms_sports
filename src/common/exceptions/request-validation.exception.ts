import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * Lo lanza el ValidationPipe global. Guarda un mensaje por campo, igual que
 * MethodArgumentNotValidException en ms_security: { "name": "El nombre es obligatorio" }.
 */
export class RequestValidationException extends BadRequestException {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Datos de entrada inválidos');
  }

  static fromValidationErrors(
    errors: ValidationError[],
  ): RequestValidationException {
    const fieldErrors: Record<string, string> = {};

    const collect = (items: ValidationError[], parentPath: string): void => {
      for (const error of items) {
        const field = parentPath
          ? `${parentPath}.${error.property}`
          : error.property;
        const messages = Object.values(error.constraints ?? {});
        if (messages.length > 0 && !(field in fieldErrors)) {
          fieldErrors[field] = messages[0];
        }
        if (error.children?.length) {
          collect(error.children, field);
        }
      }
    };

    collect(errors, '');
    return new RequestValidationException(fieldErrors);
  }
}
