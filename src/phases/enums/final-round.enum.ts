export enum FinalRound {
  ROUND_OF_16 = 'ROUND_OF_16',
  QUARTER_FINAL = 'QUARTER_FINAL',
  SEMI_FINAL = 'SEMI_FINAL',
  THIRD_PLACE = 'THIRD_PLACE',
  FINAL = 'FINAL',
}

// Posición de cada ronda en el cuadro eliminatorio. THIRD_PLACE y FINAL
// tienen la misma posición: pueden compartir order (y no se restringen
// entre sí). Único dueño: lo usan FinalPhasesService (secuencia de órdenes)
// y BracketBuilder (orden de las llaves en HU-GC-08b).
export const ROUND_SEQUENCE: Readonly<Record<FinalRound, number>> = {
  [FinalRound.ROUND_OF_16]: 1,
  [FinalRound.QUARTER_FINAL]: 2,
  [FinalRound.SEMI_FINAL]: 3,
  [FinalRound.THIRD_PLACE]: 4,
  [FinalRound.FINAL]: 4,
};
