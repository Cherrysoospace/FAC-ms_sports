import { Injectable, Logger } from '@nestjs/common';

export type MatchStartedListener = (matchId: number) => void | Promise<void>;

/**
 * Avisos del ciclo de vida de un partido (observer).
 *
 * MatchesService solo avisa que un partido empezó; no sabe quién escucha.
 * Así otros módulos (p. ej. el simulador de posiciones en desarrollo)
 * reaccionan sin que Partidos dependa de ellos (OCP/DIP).
 */
@Injectable()
export class MatchLifecycleEvents {
  private readonly logger = new Logger(MatchLifecycleEvents.name);
  private readonly startedListeners: MatchStartedListener[] = [];

  onStarted(listener: MatchStartedListener): void {
    this.startedListeners.push(listener);
  }

  // Un oyente que falla no afecta al cambio de estado ni a los demás oyentes.
  notifyStarted(matchId: number): void {
    for (const listener of this.startedListeners) {
      Promise.resolve()
        .then(() => listener(matchId))
        .catch((error: unknown) =>
          this.logger.warn(
            `Un oyente de "partido iniciado" (#${matchId}) falló: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }
  }
}
