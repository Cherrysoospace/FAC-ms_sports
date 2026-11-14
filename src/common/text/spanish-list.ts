/**
 * Helpers para armar mensajes en español con conteos y listas.
 * Ej.: joinList([plural(2, 'fase', 'fases'), plural(1, 'torneo', 'torneos')])
 *      → '2 fases y 1 torneo'
 */

// '1 fase' / '3 fases'. Siempre devuelve texto, también con 0.
export function formatCount(
  count: number,
  singular: string,
  pluralForm: string,
): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Igual que formatCount, pero null cuando count es 0 (para filtrar dependencias vacías).
export function plural(
  count: number,
  singular: string,
  pluralForm: string,
): string | null {
  if (count === 0) return null;
  return formatCount(count, singular, pluralForm);
}

// ['a'] → 'a'; ['a', 'b', 'c'] → 'a, b y c'
export function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
