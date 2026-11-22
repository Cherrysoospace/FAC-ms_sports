import { ObjectLiteral, Repository } from 'typeorm';

/**
 * Ancestros en tablas jerárquicas con autorrelación (`parent_id`), como
 * deportes → subdeportes y escenarios → espacios internos.
 *
 * Una sola consulta (CTE recursiva de MySQL 8) para uno o varios ids, en vez
 * de una consulta por nivel. Conserva el corte ante ciclos en los datos:
 * cada fila lleva el camino recorrido (`,origen,padre,...,`) y no se avanza a
 * un id que ya esté en el camino. Como red de seguridad también hay un límite
 * de profundidad (por debajo de cte_max_recursion_depth = 1000 de MySQL).
 */

// Más niveles de los que tendrá cualquier jerarquía real del proyecto.
export const MAX_HIERARCHY_DEPTH = 500;

// Fila cruda: MySQL puede devolver los números como texto.
export interface AncestorRow {
  originId: number | string;
  ancestorId: number | string;
  depth: number | string;
}

/**
 * SQL de la CTE. `table` y `parentColumn` vienen de la metadata de TypeORM
 * (nunca del usuario); los ids van como parámetros.
 * - Ancla: el padre de cada id pedido (si no es él mismo).
 * - Paso: el padre del último ancestro, si no está ya en el camino.
 */
export function buildAncestorsSql(
  table: string,
  parentColumn: string,
  idsCount: number,
): string {
  const placeholders = Array.from({ length: idsCount }, () => '?').join(', ');
  return `
    WITH RECURSIVE chain (origin_id, ancestor_id, depth, path) AS (
      SELECT t.id, t.\`${parentColumn}\`, 1,
             CAST(CONCAT(',', t.id, ',') AS CHAR(8000))
      FROM \`${table}\` t
      WHERE t.id IN (${placeholders})
        AND t.\`${parentColumn}\` IS NOT NULL
        AND t.\`${parentColumn}\` <> t.id
      UNION ALL
      SELECT c.origin_id, p.\`${parentColumn}\`, c.depth + 1,
             CONCAT(c.path, c.ancestor_id, ',')
      FROM chain c
      JOIN \`${table}\` p ON p.id = c.ancestor_id
      WHERE p.\`${parentColumn}\` IS NOT NULL
        AND LOCATE(CONCAT(',', p.\`${parentColumn}\`, ','),
                   CONCAT(c.path, c.ancestor_id, ',')) = 0
        AND c.depth < ${MAX_HIERARCHY_DEPTH}
    )
    SELECT origin_id AS originId, ancestor_id AS ancestorId, depth
    FROM chain
    ORDER BY origin_id, depth`;
}

/**
 * Filas → Map<id, [padre, abuelo, ...]> con una entrada (quizá vacía) por
 * cada id pedido. Ordena por profundidad y vuelve a cortar ante un id
 * repetido (o el propio origen), por si las filas llegaran desordenadas o
 * con un ciclo: mismo contrato que el recorrido nivel por nivel anterior.
 */
export function groupAncestorRows(
  ids: readonly number[],
  rows: readonly AncestorRow[],
): Map<number, number[]> {
  const result = new Map<number, number[]>(ids.map((id) => [id, []]));
  const sorted = [...rows].sort(
    (a, b) =>
      Number(a.originId) - Number(b.originId) ||
      Number(a.depth) - Number(b.depth),
  );
  const cut = new Set<number>();

  for (const row of sorted) {
    const originId = Number(row.originId);
    const ancestorId = Number(row.ancestorId);
    const ancestors = result.get(originId);
    if (!ancestors || cut.has(originId)) continue;
    if (ancestorId === originId || ancestors.includes(ancestorId)) {
      cut.add(originId);
      continue;
    }
    ancestors.push(ancestorId);
  }
  return result;
}

/** Ancestros de varios ids en UNA consulta. */
export async function findAncestorIdsMany(
  repository: Repository<ObjectLiteral>,
  ids: readonly number[],
  parentColumn = 'parent_id',
): Promise<Map<number, number[]>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const sql = buildAncestorsSql(
    repository.metadata.tableName,
    parentColumn,
    unique.length,
  );
  const rows: AncestorRow[] = await repository.query(sql, unique);
  return groupAncestorRows(unique, rows);
}
