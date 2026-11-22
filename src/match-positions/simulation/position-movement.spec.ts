import { formation, initialState, nextSnapshot } from './position-movement';

// Azar fijo: 0.5 = sin desplazamiento aleatorio
const still = () => 0.5;

describe('position-movement (pizarra HU-GC-09)', () => {
  it('ubica al local en su mitad (x < 50) y al visitante en la suya', () => {
    const home = formation([1, 2, 3, 4, 5], 'HOME');
    const away = formation([6, 7, 8, 9, 10], 'AWAY');

    expect(home.every((p) => p.x < 50)).toBe(true);
    expect(away.every((p) => p.x > 50)).toBe(true);
    expect(home.map((p) => p.playerId)).toEqual([1, 2, 3, 4, 5]);
  });

  it('cada foto trae a todos los jugadores y una sola pelota, dentro del campo', () => {
    const state = initialState([1, 2, 3], [4, 5, 6]);
    for (let i = 0; i < 200; i++) {
      const snapshot = nextSnapshot(state);
      expect(snapshot).toHaveLength(7);
      expect(snapshot.filter((item) => item.ball)).toHaveLength(1);
      for (const item of snapshot) {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeLessThanOrEqual(100);
        expect(item.y).toBeGreaterThanOrEqual(0);
        expect(item.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('la pelota sigue a su poseedor', () => {
    const state = initialState([1], [2], still);
    const snapshot = nextSnapshot(state, still);
    const carrier = state.players[state.carrierIndex];
    const ball = snapshot.find((item) => item.ball)!;

    expect(ball.x).toBeCloseTo(carrier.x, 1);
    expect(ball.y).toBeCloseTo(carrier.y, 1);
  });
});
