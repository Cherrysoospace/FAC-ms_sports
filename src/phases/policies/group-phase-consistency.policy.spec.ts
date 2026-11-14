import type { GroupPhase } from '../entities/group-phase.entity';
import {
  GroupPhaseConsistencyPolicy,
  SharedPhaseValues,
} from './group-phase-consistency.policy';

const group = (overrides: Partial<GroupPhase> = {}) =>
  ({
    id: 1,
    name: 'Fase de grupos',
    order: 1,
    groupName: 'A',
    startDate: '2026-12-10',
    endDate: '2026-12-14',
    ...overrides,
  }) as GroupPhase;

const SHARED: SharedPhaseValues = {
  name: 'Fase de grupos',
  startDate: '2026-12-10',
  endDate: '2026-12-14',
};

describe('GroupPhaseConsistencyPolicy.assertMatchesSiblings', () => {
  it('sin grupos hermanos no valida nada', () => {
    expect(() =>
      GroupPhaseConsistencyPolicy.assertMatchesSiblings(
        [],
        { ...SHARED, name: 'Otra' },
        1,
      ),
    ).not.toThrow();
  });

  it('acepta los mismos nombre y fechas que los hermanos', () => {
    expect(() =>
      GroupPhaseConsistencyPolicy.assertMatchesSiblings([group()], SHARED, 1),
    ).not.toThrow();
  });

  const expectedMessage =
    'Los grupos del orden 1 forman una sola fase y deben compartir nombre y ' +
    'fechas. Valores esperados: name "Fase de grupos", startDate 2026-12-10, ' +
    'endDate 2026-12-14';

  it('rechaza un nombre distinto', () => {
    expect(() =>
      GroupPhaseConsistencyPolicy.assertMatchesSiblings(
        [group()],
        { ...SHARED, name: 'Primera ronda' },
        1,
      ),
    ).toThrow(expectedMessage);
  });

  it('rechaza fechas distintas', () => {
    expect(() =>
      GroupPhaseConsistencyPolicy.assertMatchesSiblings(
        [group()],
        { ...SHARED, endDate: '2026-12-15' },
        1,
      ),
    ).toThrow(expectedMessage);
  });

  it('muestra null cuando los hermanos no tienen fechas', () => {
    expect(() =>
      GroupPhaseConsistencyPolicy.assertMatchesSiblings(
        [group({ startDate: undefined, endDate: undefined })],
        SHARED,
        2,
      ),
    ).toThrow('startDate null, endDate null');
  });
});

describe('GroupPhaseConsistencyPolicy: propagación a grupos hermanos', () => {
  const current = GroupPhaseConsistencyPolicy.sharedValuesOf(group());

  it('mergeUpdate: undefined conserva el valor, null borra la fecha', () => {
    expect(
      GroupPhaseConsistencyPolicy.mergeUpdate(current, {
        name: 'Grupos',
        endDate: null,
      }),
    ).toEqual({ name: 'Grupos', startDate: '2026-12-10', endDate: null });
  });

  it('propaga cuando cambian nombre o fechas sin cambiar de order', () => {
    const next = { ...current, name: 'Grupos' };
    expect(
      GroupPhaseConsistencyPolicy.valuesToPropagate(current, next, false),
    ).toEqual(next);
  });

  it('no propaga si nada compartido cambió', () => {
    expect(
      GroupPhaseConsistencyPolicy.valuesToPropagate(
        current,
        { ...current },
        false,
      ),
    ).toBeNull();
  });

  it('no propaga si el grupo cambia de order', () => {
    expect(
      GroupPhaseConsistencyPolicy.valuesToPropagate(
        current,
        { ...current, name: 'Grupos' },
        true,
      ),
    ).toBeNull();
  });

  it('applyTo copia nombre y fechas a todos los hermanos', () => {
    const siblings = [
      group({ id: 2, groupName: 'B' }),
      group({ id: 3, groupName: 'C' }),
    ];
    GroupPhaseConsistencyPolicy.applyTo(siblings, {
      name: 'Grupos',
      startDate: '2026-12-11',
      endDate: null,
    });
    for (const sibling of siblings) {
      expect(GroupPhaseConsistencyPolicy.sharedValuesOf(sibling)).toEqual({
        name: 'Grupos',
        startDate: '2026-12-11',
        endDate: null,
      });
    }
    expect(siblings.map((s) => s.groupName)).toEqual(['B', 'C']);
  });
});
