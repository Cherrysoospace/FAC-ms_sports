/**
 * Utilidades para fechas de día 'YYYY-MM-DD' (columnas `date`).
 * Con ese formato se pueden comparar como texto: '2026-01-31' < '2026-02-01'.
 */

// '2001-02-30' tiene el formato correcto pero no existe en el calendario.
export function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Fecha local 'YYYY-MM-DD' de un Date.
export function toDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// 'YYYY-MM-DD' → 'DD/MM/YYYY' para los mensajes al usuario.
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
