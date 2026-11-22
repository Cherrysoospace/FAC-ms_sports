import { ObjectLiteral, Repository } from 'typeorm';
import {
  AncestorRow,
  MAX_HIERARCHY_DEPTH,
  buildAncestorsSql,
  findAncestorIdsMany,
  groupAncestorRows,
} from './hierarchy.util';

// Repositorio falso: guarda la consulta y responde con `rows`.
const repositoryReturning = (rows: AncestorRow[]) => {
  const query = jest.fn(async (_sql: string, _params: number[]) => rows);
  const repository = {
    metadata: { tableName: 'venues' },
    query,
  } as unknown as Repository<ObjectLiteral>;
  return { repository, query };
};

describe('buildAncestorsSql', () => {
  const sql = buildAncestorsSql('venues', 'parent_id', 3);

  it('es UNA consulta recursiva sobre la tabla con un parámetro por id', () => {
    expect(sql).toContain('WITH RECURSIVE');
    expect(sql).toContain('FROM `venues` t');
    expect(sql).toContain('t.id IN (?, ?, ?)');
  });

  it('lleva el camino recorrido y un límite de profundidad para cortar ciclos', () => {
    // No se avanza a un id que ya está en el camino
    expect(sql).toMatch(/LOCATE\(CONCAT\(',', p\.`parent_id`, ','\)/);
    // Ni a un padre que es el propio nodo
    expect(sql).toContain('t.`parent_id` <> t.id');
    expect(sql).toContain(`c.depth < ${MAX_HIERARCHY_DEPTH}`);
    expect(MAX_HIERARCHY_DEPTH).toBeLessThan(1000);
  });

  it('ordena por origen y profundidad (padre, abuelo, ...)', () => {
    expect(sql).toContain('ORDER BY origin_id, depth');
  });
});

describe('groupAncestorRows', () => {
  it('padre, abuelo... en orden de profundidad, aunque las filas lleguen desordenadas', () => {
    const rows: AncestorRow[] = [
      { originId: 3, ancestorId: 1, depth: 2 },
      { originId: 3, ancestorId: 2, depth: 1 },
    ];
    expect(groupAncestorRows([3], rows)).toEqual(new Map([[3, [2, 1]]]));
  });

  it('convierte a número lo que MySQL devuelve como texto', () => {
    const rows: AncestorRow[] = [
      { originId: '5', ancestorId: '4', depth: '1' },
    ];
    expect(groupAncestorRows([5], rows)).toEqual(new Map([[5, [4]]]));
  });

  it('corte de ciclos: se detiene en el primer id repetido', () => {
    // 3 → 2 → 1 → 2 → 1 ... (ciclo 1 ↔ 2)
    const rows: AncestorRow[] = [
      { originId: 3, ancestorId: 2, depth: 1 },
      { originId: 3, ancestorId: 1, depth: 2 },
      { originId: 3, ancestorId: 2, depth: 3 },
      { originId: 3, ancestorId: 1, depth: 4 },
    ];
    expect(groupAncestorRows([3], rows).get(3)).toEqual([2, 1]);
  });

  it('corte de ciclos: si el camino vuelve al origen, el origen no es su propio ancestro', () => {
    // 1 → 2 → 1
    const rows: AncestorRow[] = [
      { originId: 1, ancestorId: 2, depth: 1 },
      { originId: 1, ancestorId: 1, depth: 2 },
      { originId: 1, ancestorId: 2, depth: 3 },
    ];
    expect(groupAncestorRows([1], rows).get(1)).toEqual([2]);
  });

  it('cada id pedido tiene entrada, vacía si es raíz o no existe', () => {
    expect(groupAncestorRows([7, 8], [])).toEqual(
      new Map([
        [7, []],
        [8, []],
      ]),
    );
  });
});

describe('findAncestorIdsMany', () => {
  it('resuelve varios ids con UNA sola consulta', async () => {
    const { repository, query } = repositoryReturning([
      { originId: 3, ancestorId: 2, depth: 1 },
      { originId: 3, ancestorId: 1, depth: 2 },
      { originId: 4, ancestorId: 1, depth: 1 },
    ]);

    const result = await findAncestorIdsMany(repository, [3, 4, 1]);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([3, 4, 1]);
    expect(result).toEqual(
      new Map([
        [3, [2, 1]],
        [4, [1]],
        [1, []],
      ]),
    );
  });

  it('no repite ids en los parámetros', async () => {
    const { repository, query } = repositoryReturning([]);
    await findAncestorIdsMany(repository, [3, 3, 4]);
    expect(query.mock.calls[0][1]).toEqual([3, 4]);
    expect(query.mock.calls[0][0]).toContain('t.id IN (?, ?)');
  });

  it('sin ids no consulta la base', async () => {
    const { repository, query } = repositoryReturning([]);
    await expect(findAncestorIdsMany(repository, [])).resolves.toEqual(
      new Map(),
    );
    expect(query).not.toHaveBeenCalled();
  });
});
