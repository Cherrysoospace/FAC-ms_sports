import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatchesService } from '../../matches/matches.service';
import { MatchLifecycleEvents } from '../../matches/match-lifecycle.events';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { TeamPlayersService } from '../../team-players/team-players.service';
import { ContractStage } from '../../team-players/enums/contract-stage.enum';
import { MatchPositionsService } from '../match-positions.service';
import {
  initialState,
  nextSnapshot,
  RandomFn,
  SimulationState,
} from './position-movement';

const DEFAULT_INTERVAL_MS = 1500;
const MIN_INTERVAL_MS = 500;

interface RunningSimulation {
  timer: ReturnType<typeof setInterval>;
  state: SimulationState;
  busy: boolean;
  ticks: number;
}

/**
 * Simulador automático de la pizarra (HU-GC-09), SOLO para desarrollo y demo.
 *
 * Con SIMULATE_POSITIONS=true, cada partido que pasa a "En curso" empieza a
 * registrar posiciones solo (cada SIMULATE_POSITIONS_INTERVAL_MS) y se
 * detiene cuando el partido deja de estar en curso. Registra a través de
 * MatchPositionsService.record, así que aplica las mismas validaciones que
 * POST /match-positions. Apagado (por defecto) no hace nada.
 *
 * El script scripts/simulate-positions.mjs sigue siendo el ejemplo de cliente
 * externo que se autentica con el usuario de servicio.
 */
@Injectable()
export class PositionSimulator
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PositionSimulator.name);
  private readonly running = new Map<number, RunningSimulation>();
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private random: RandomFn = Math.random;

  constructor(
    config: ConfigService,
    private readonly lifecycle: MatchLifecycleEvents,
    private readonly matchesService: MatchesService,
    private readonly teamPlayersService: TeamPlayersService,
    private readonly positionsService: MatchPositionsService,
  ) {
    this.enabled =
      (config.get<string>('SIMULATE_POSITIONS') ?? 'false')
        .trim()
        .toLowerCase() === 'true';
    const interval = Number(
      config.get<string>('SIMULATE_POSITIONS_INTERVAL_MS'),
    );
    this.intervalMs =
      Number.isFinite(interval) && interval >= MIN_INTERVAL_MS
        ? interval
        : DEFAULT_INTERVAL_MS;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) return;
    this.lifecycle.onStarted((matchId) => this.start(matchId));
    this.logger.log(
      `Simulación automática de posiciones ACTIVA (cada ${this.intervalMs} ms). Solo para desarrollo.`,
    );

    // Partidos que ya estaban en curso cuando se reinició el servicio
    const inProgress = await this.matchesService.findAll({
      status: MatchStatus.IN_PROGRESS,
    });
    await Promise.all(inProgress.map((match) => this.start(match.id)));
  }

  onModuleDestroy(): void {
    for (const matchId of [...this.running.keys()]) this.stop(matchId);
  }

  isRunning(matchId: number): boolean {
    return this.running.has(matchId);
  }

  // Solo para pruebas: azar determinista.
  useRandom(random: RandomFn): void {
    this.random = random;
  }

  async start(matchId: number): Promise<void> {
    if (!this.enabled || this.running.has(matchId)) return;

    const match = await this.matchesService.getMatchOrFail(matchId);
    if (match.status !== MatchStatus.IN_PROGRESS) return;

    const [homeIds, awayIds] = await Promise.all(
      [match.homeTeam.id, match.awayTeam.id].map(async (teamId) =>
        (
          await this.teamPlayersService.findAll({
            teamId,
            stage: ContractStage.CURRENT,
          })
        ).map((contract) => contract.player.id),
      ),
    );
    if (homeIds.length + awayIds.length === 0) {
      this.logger.warn(
        `Partido #${matchId}: ninguno de los equipos tiene jugadores con contrato vigente; no se simula`,
      );
      return;
    }
    // Pudo arrancar otra simulación mientras se leía la plantilla
    if (this.running.has(matchId)) return;

    const simulation: RunningSimulation = {
      state: initialState(homeIds, awayIds, this.random),
      busy: false,
      ticks: 0,
      timer: setInterval(() => void this.tick(matchId), this.intervalMs),
    };
    this.running.set(matchId, simulation);
    this.logger.log(
      `▶ Simulando partido #${matchId}: ${match.homeTeam.name} (${homeIds.length}) vs ${match.awayTeam.name} (${awayIds.length})`,
    );
  }

  stop(matchId: number): void {
    const simulation = this.running.get(matchId);
    if (!simulation) return;
    clearInterval(simulation.timer);
    this.running.delete(matchId);
    this.logger.log(
      `■ Simulación del partido #${matchId} detenida (${simulation.ticks} fotos)`,
    );
  }

  // Una foto del campo. Si el partido ya no está en curso (resultado o
  // cancelación), record() lo rechaza y la simulación se detiene.
  async tick(matchId: number): Promise<void> {
    const simulation = this.running.get(matchId);
    if (!simulation || simulation.busy) return;
    simulation.busy = true;
    try {
      await this.positionsService.record({
        matchId,
        positions: nextSnapshot(simulation.state, this.random),
      });
      simulation.ticks += 1;
    } catch (error) {
      this.logger.log(
        `Partido #${matchId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.stop(matchId);
    } finally {
      simulation.busy = false;
    }
  }
}
