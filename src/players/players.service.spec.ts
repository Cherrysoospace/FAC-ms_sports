import type { Repository } from 'typeorm';
import { BusinessRuleException } from '../common/exceptions';
import type { Player } from './entities/player.entity';
import type { PlayersRepository } from './repositories/players.repository';
import { PlayersService } from './players.service';

const makePlayer = () =>
  ({ id: 3, fullName: 'Dayro Moreno' }) as unknown as Player;

describe('PlayersService.remove', () => {
  let service: PlayersService;
  const playerRepository = {
    findOne: jest.fn(async () => makePlayer()),
    remove: jest.fn(async () => undefined),
  };
  const playersRepository = {
    countContracts: jest.fn(async () => 0),
    countSkills: jest.fn(async () => 0),
    countGoals: jest.fn(async () => 0),
    countMatchPositions: jest.fn(async () => 0),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlayersService(
      playerRepository as unknown as Repository<Player>,
      playersRepository as unknown as PlayersRepository,
    );
  });

  it('elimina el jugador cuando no tiene dependencias', async () => {
    await expect(service.remove(3)).resolves.toEqual({
      message: 'Jugador #3 eliminado correctamente',
    });
    expect(playerRepository.remove).toHaveBeenCalled();
  });

  it('responde 409 con mensaje claro si tiene anotaciones y posiciones', async () => {
    playersRepository.countGoals.mockResolvedValueOnce(1);
    playersRepository.countMatchPositions.mockResolvedValueOnce(4);

    const error = await service.remove(3).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BusinessRuleException);
    expect((error as Error).message).toContain('1 anotación');
    expect((error as Error).message).toContain(
      '4 posiciones registradas en partidos',
    );
    expect(playerRepository.remove).not.toHaveBeenCalled();
  });
});
