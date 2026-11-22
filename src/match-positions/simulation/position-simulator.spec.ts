import type { ConfigService } from '@nestjs/config';
import type { Match } from '../../matches/entities/match.entity';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { MatchLifecycleEvents } from '../../matches/match-lifecycle.events';
import type { MatchesService } from '../../matches/matches.service';
import type { TeamPlayersService } from '../../team-players/team-players.service';
import { ApplicationException, ErrorCase } from '../../common/exceptions';
import type { MatchPositionsService } from '../match-positions.service';
import { PositionSimulator } from './position-simulator';

const makeMatch = (status = MatchStatus.IN_PROGRESS) =>
  ({
    id: 7,
    status,
    homeTeam: { id: 1, name: 'Once Caldas' },
    awayTeam: { id: 2, name: 'Nacional' },
  }) as unknown as Match;

const config = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

// Deja correr los callbacks asíncronos pendientes
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('PositionSimulator (simulación automática de la pizarra)', () => {
  const matchesService = {
    getMatchOrFail: jest.fn(async () => makeMatch()),
    findAll: jest.fn(async () => [] as { id: number }[]),
  };
  const teamPlayersService = {
    findAll: jest.fn(async ({ teamId }: { teamId: number }) => [
      { player: { id: teamId * 10 + 1 } },
      { player: { id: teamId * 10 + 2 } },
    ]),
  };
  const positionsService = {
    record: jest.fn(async () => ({ matchId: 7, recorded: 5 })),
  };
  let lifecycle: MatchLifecycleEvents;
  let simulator: PositionSimulator;

  const build = (values: Record<string, string>) => {
    lifecycle = new MatchLifecycleEvents();
    simulator = new PositionSimulator(
      config(values),
      lifecycle,
      matchesService as unknown as MatchesService,
      teamPlayersService as unknown as TeamPlayersService,
      positionsService as unknown as MatchPositionsService,
    );
    return simulator;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  });

  afterEach(() => {
    simulator?.onModuleDestroy();
    jest.useRealTimers();
  });

  it('apagado (por defecto) no escucha ni simula', async () => {
    await build({}).onApplicationBootstrap();
    lifecycle.notifyStarted(7);
    await flush();

    expect(simulator.isRunning(7)).toBe(false);
    expect(matchesService.findAll).not.toHaveBeenCalled();
  });

  it('encendido: al iniciar el partido registra una foto en cada intervalo', async () => {
    await build({
      SIMULATE_POSITIONS: 'true',
      SIMULATE_POSITIONS_INTERVAL_MS: '1000',
    }).onApplicationBootstrap();

    lifecycle.notifyStarted(7);
    await flush();
    expect(simulator.isRunning(7)).toBe(true);

    await jest.advanceTimersByTimeAsync(3000);
    expect(positionsService.record).toHaveBeenCalledTimes(3);
    const [{ matchId, positions }] = positionsService.record.mock
      .calls[0] as unknown as [
      { matchId: number; positions: { playerId?: number; ball?: boolean }[] },
    ];
    expect(matchId).toBe(7);
    // 2 jugadores por equipo + la pelota
    expect(positions).toHaveLength(5);
    expect(positions.filter((p) => p.ball)).toHaveLength(1);
  });

  it('no arranca dos simulaciones para el mismo partido', async () => {
    await build({ SIMULATE_POSITIONS: 'true' }).onApplicationBootstrap();
    await Promise.all([simulator.start(7), simulator.start(7)]);

    await jest.advanceTimersByTimeAsync(1500);
    expect(positionsService.record).toHaveBeenCalledTimes(1);
  });

  it('se detiene sola cuando el partido deja de estar en curso', async () => {
    await build({ SIMULATE_POSITIONS: 'true' }).onApplicationBootstrap();
    await simulator.start(7);
    positionsService.record.mockRejectedValueOnce(
      new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El seguimiento solo se registra mientras el partido está en curso',
      ),
    );

    await jest.advanceTimersByTimeAsync(1500);
    expect(simulator.isRunning(7)).toBe(false);

    await jest.advanceTimersByTimeAsync(6000);
    expect(positionsService.record).toHaveBeenCalledTimes(1);
  });

  it('retoma los partidos que ya estaban en curso al reiniciar el servicio', async () => {
    matchesService.findAll.mockResolvedValueOnce([{ id: 7 }]);
    await build({ SIMULATE_POSITIONS: 'true' }).onApplicationBootstrap();

    expect(matchesService.findAll).toHaveBeenCalledWith({
      status: MatchStatus.IN_PROGRESS,
    });
    expect(simulator.isRunning(7)).toBe(true);
  });

  it('no simula partidos que no están en curso ni equipos sin jugadores', async () => {
    await build({ SIMULATE_POSITIONS: 'true' }).onApplicationBootstrap();

    matchesService.getMatchOrFail.mockResolvedValueOnce(
      makeMatch(MatchStatus.SCHEDULED),
    );
    await simulator.start(7);
    expect(simulator.isRunning(7)).toBe(false);

    teamPlayersService.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await simulator.start(7);
    expect(simulator.isRunning(7)).toBe(false);
  });
});
