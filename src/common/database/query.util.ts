// Escapa los comodines de LIKE (\ % _) para buscar el texto literal.
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Fila de un conteo con GROUP BY: MySQL puede devolver números como texto.
export interface CountRow {
  id: number | string;
  total: number | string;
}

// [{ id, total }] → Map<id, total> con ambos convertidos a número.
export function toCountMap(rows: CountRow[]): Map<number, number> {
  return new Map(rows.map((row) => [Number(row.id), Number(row.total)]));
}
