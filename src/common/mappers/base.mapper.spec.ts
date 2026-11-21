import { BaseMapper } from './base.mapper';
import {
  BET_SETTLEMENT_PORT,
  MATCH_AUDIENCE_PORT,
  PAYMENT_METHOD_VALIDATORS,
  TICKET_CAPACITY_PORT,
} from '../contracts';

interface SampleEntity {
  id: number;
  name: string;
}

interface SampleResponseDto {
  id: number;
  label: string;
}

class SampleMapper extends BaseMapper<SampleEntity, SampleResponseDto> {
  constructor(private readonly prefix: string) {
    super();
  }

  toDto(entity: SampleEntity): SampleResponseDto {
    return {
      id: entity.id,
      label: `${this.prefix}:${entity.name}`,
    };
  }
}

describe('BaseMapper', () => {
  it('mapea una entidad individual y una lista preservando el contexto this', () => {
    const mapper = new SampleMapper('ITEM');

    expect(mapper.toDto({ id: 1, name: 'VIP' })).toEqual({
      id: 1,
      label: 'ITEM:VIP',
    });

    expect(
      mapper.toDtoList([
        { id: 1, name: 'VIP' },
        { id: 2, name: 'General' },
      ]),
    ).toEqual([
      { id: 1, label: 'ITEM:VIP' },
      { id: 2, label: 'ITEM:General' },
    ]);
  });

  it('retorna arreglo vacío cuando recibe una lista vacía', () => {
    const mapper = new SampleMapper('ITEM');

    expect(mapper.toDtoList([])).toEqual([]);
  });
});

describe('DIP contract tokens', () => {
  it('define los 4 tokens como Symbol únicos e independientes', () => {
    const tokens = [
      PAYMENT_METHOD_VALIDATORS,
      BET_SETTLEMENT_PORT,
      MATCH_AUDIENCE_PORT,
      TICKET_CAPACITY_PORT,
    ];

    for (const token of tokens) {
      expect(typeof token).toBe('symbol');
    }
    expect(new Set(tokens).size).toBe(4);
  });
});

