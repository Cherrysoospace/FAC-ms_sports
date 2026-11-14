import { Transform } from 'class-transformer';
import { Matches, ValidateIf, ValidationOptions } from 'class-validator';

/**
 * Conversión explícita de booleanos en query string: 'true' o true → true;
 * cualquier otro valor presente → false; ausente → undefined (sin filtro).
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }): unknown =>
    value === undefined ? undefined : value === 'true' || value === true,
  );
}

// Quita espacios al inicio y al final y colapsa los internos. Solo afecta strings.
export function TrimSpaces(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );
}

/**
 * Para campos NOT NULL en un PATCH: si el campo no viene (undefined) no se
 * valida; si viene, aunque sea null, se valida. Así null devuelve 400.
 * Equivale a @ValidateIf((_, value) => value !== undefined).
 */
export function NotNullIfPresent(): PropertyDecorator {
  return ValidateIf((_, value: unknown) => value !== undefined);
}

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Fecha sin hora con formato YYYY-MM-DD.
export function IsDateOnly(message: string): PropertyDecorator {
  const options: ValidationOptions = { message };
  return Matches(DATE_ONLY_REGEX, options);
}
