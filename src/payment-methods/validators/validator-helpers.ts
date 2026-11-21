import { ApplicationException, ErrorCase } from '../../common/exceptions';

export function requireText(
  details: Record<string, unknown>,
  field: string,
  minLength: number,
  label: string,
): string {
  const raw = details[field];
  if (typeof raw !== 'string' || raw.trim().length < minLength) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El campo ${label} (${field}) es obligatorio y debe tener al menos ${minLength} caracteres`,
    );
  }
  return raw.trim();
}

export function requireAllowedValue(
  details: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  label: string,
): string {
  const raw = details[field];
  const normalized = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!allowed.includes(normalized)) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El campo ${label} (${field}) debe ser uno de: ${allowed.join(', ')}`,
    );
  }
  return normalized;
}

export function requireIntInRange(
  details: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  label: string,
): number {
  const raw = details[field];
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > max) {
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `El campo ${label} (${field}) debe ser un número entero entre ${min} y ${max}`,
    );
  }
  return raw;
}
