import { ValueTransformer } from 'typeorm';

/** MySQL devuelve las columnas decimal como texto: se convierten a number al leer. */
export const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
