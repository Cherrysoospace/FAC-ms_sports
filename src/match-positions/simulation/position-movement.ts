/**
 * Movimiento simulado para la pizarra (HU-GC-09). Funciones puras: el azar
 * llega como parámetro para poder probarlas. Es la misma lógica que
 * scripts/simulate-positions.mjs (el cliente externo de ejemplo).
 */

export type Side = 'HOME' | 'AWAY';

export interface SimulatedPlayer {
  playerId: number;
  x: number;
  y: number;
  side: Side;
}

export interface SimulationState {
  players: SimulatedPlayer[];
  ball: { x: number; y: number };
  carrierIndex: number;
}

export interface SnapshotItem {
  playerId?: number;
  ball?: true;
  x: number;
  y: number;
}

export type RandomFn = () => number;

// Probabilidad de que la pelota cambie de dueño en cada foto (un pase)
const PASS_PROBABILITY = 0.25;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;
const jitter = (random: RandomFn, amount: number) =>
  (random() - 0.5) * 2 * amount;

// Formación inicial: el local ataca hacia x = 100 desde su mitad (x < 50)
export function formation(playerIds: number[], side: Side): SimulatedPlayer[] {
  return playerIds.map((playerId, index) => {
    const column = Math.floor(index / 4);
    const row = index % 4;
    const x = side === 'HOME' ? 10 + column * 12 : 90 - column * 12;
    return { playerId, x: clamp(x, 3, 97), y: 15 + row * 23, side };
  });
}

export function initialState(
  homePlayerIds: number[],
  awayPlayerIds: number[],
  random: RandomFn = Math.random,
): SimulationState {
  const players = [
    ...formation(homePlayerIds, 'HOME'),
    ...formation(awayPlayerIds, 'AWAY'),
  ];
  return {
    players,
    ball: { x: 50, y: 50 },
    carrierIndex: Math.floor(random() * players.length),
  };
}

/**
 * Avanza un instante: cada jugador se mueve un poco y tiende a volver a su
 * zona; la pelota sigue a su poseedor. Devuelve la "foto" para registrar.
 */
export function nextSnapshot(
  state: SimulationState,
  random: RandomFn = Math.random,
): SnapshotItem[] {
  for (const point of state.players) {
    const zone = point.side === 'HOME' ? 30 : 70;
    point.x = clamp(
      point.x + jitter(random, 4) + (zone - point.x) * 0.03,
      1,
      99,
    );
    point.y = clamp(point.y + jitter(random, 4), 1, 99);
  }

  if (random() < PASS_PROBABILITY) {
    state.carrierIndex = Math.floor(random() * state.players.length);
  }
  const carrier = state.players[state.carrierIndex];
  state.ball.x = clamp(carrier.x + jitter(random, 2), 0, 100);
  state.ball.y = clamp(carrier.y + jitter(random, 2), 0, 100);

  return [
    ...state.players.map((point) => ({
      playerId: point.playerId,
      x: round(point.x),
      y: round(point.y),
    })),
    { ball: true as const, x: round(state.ball.x), y: round(state.ball.y) },
  ];
}
