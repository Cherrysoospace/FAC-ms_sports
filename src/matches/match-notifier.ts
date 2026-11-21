import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Match } from './entities/match.entity';
import { MatchMapper } from './mappers/match.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { Goal } from '../goals/entities/goal.entity';
import {
  MATCH_AUDIENCE_PORT,
  type IMatchAudiencePort,
} from '../common/contracts';

/**
 * HU-GC-06 y HU-GC-07: avisa por correo a aficionados en creación, anotación y
 * resultado final del partido. Separado de MatchesService para mantener una
 * única responsabilidad de mensajería.
 */
@Injectable()
export class MatchNotifier {
  private readonly logger = new Logger(MatchNotifier.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @Optional()
    @Inject(MATCH_AUDIENCE_PORT)
    private readonly audiencePort?: IMatchAudiencePort,
  ) {}

  // Requiere el partido con phase (y tournament), equipos y escenario cargados.
  async notifyNewMatch(match: Match): Promise<void> {
    const recipients = await this.findFansOfPreviousMatches(match);
    if (recipients.length === 0) {
      this.logger.log(
        `Partido #${match.id}: no hay aficionados de partidos anteriores a quienes avisar`,
      );
      return;
    }

    const { homeTeam, awayTeam, phase, venue } = match;
    await this.notificationsService.notify({
      to: recipients,
      subject: `Nuevo partido: ${homeTeam.name} vs ${awayTeam.name}`,
      body:
        `Se programó un nuevo partido de ${phase.tournament.name} ` +
        `(${MatchMapper.phaseLabel(phase)}).\n\n` +
        `${homeTeam.name} vs ${awayTeam.name}\n` +
        `Fecha: ${match.scheduledAt.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}\n` +
        `Escenario: ${venue.name}\n\n` +
        'Recibes este correo porque asististe o apostaste en partidos anteriores de estos equipos.',
    });
  }

  // HU-GC-07: resume el resultado final del partido a quienes tienen boleto o apuesta.
  async notifyMatchResult(
    match: Match,
    isFirstFinalization: boolean,
  ): Promise<void> {
    const recipients = await this.findFansOfMatch(match);
    if (recipients.length === 0) {
      this.logger.log(
        `Partido #${match.id}: no hay aficionados con boleto o apuesta para avisar del resultado`,
      );
      return;
    }

    const { homeTeam, awayTeam, phase, venue } = match;
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const prefix = isFirstFinalization
      ? 'Resultado final'
      : 'Resultado actualizado';

    await this.notificationsService.notify({
      to: recipients,
      subject: `${prefix}: ${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`,
      body:
        `${prefix} de ${phase.tournament.name} (${MatchMapper.phaseLabel(phase)}).\n\n` +
        `${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}\n` +
        `Fecha: ${match.scheduledAt.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}\n` +
        `Escenario: ${venue.name}\n\n` +
        'Recibes este correo porque compraste boleto o realizaste una apuesta en este partido.',
    });
  }

  // HU-GC-07: avisa cada anotación registrada a quienes tienen boleto o apuesta en el partido.
  async notifyGoalRecorded(match: Match, goal: Goal): Promise<void> {
    const recipients = await this.findFansOfMatch(match);
    if (recipients.length === 0) {
      this.logger.log(
        `Partido #${match.id}: no hay aficionados con boleto o apuesta para avisar la anotación #${goal.id}`,
      );
      return;
    }

    const { homeTeam, awayTeam, phase } = match;
    const detail = goal.description ? `\nDetalle: ${goal.description}` : '';

    await this.notificationsService.notify({
      to: recipients,
      subject: `Nueva anotación en ${homeTeam.name} vs ${awayTeam.name} (${goal.player.fullName}, ${goal.minute}')`,
      body:
        `Se registró una anotación en ${phase.tournament.name} (${MatchMapper.phaseLabel(phase)}).\n\n` +
        `Partido: ${homeTeam.name} vs ${awayTeam.name}\n` +
        `Jugador: ${goal.player.fullName}\n` +
        `Minuto: ${goal.minute}' | Puntos: ${goal.points}${detail}\n\n` +
        'Recibes este correo porque compraste boleto o realizaste una apuesta en este partido.',
    });
  }

  /**
   * Correos de los aficionados con boleto o apuesta en partidos anteriores
   * (distintos de `match`) de cualquiera de los dos equipos.
   *
   * TODO (Fercho): en Fase 12 conectar el proveedor real de `MATCH_AUDIENCE_PORT`.
   */
  private findFansOfPreviousMatches(match: Match): Promise<string[]> {
    if (!this.audiencePort) return Promise.resolve([]);
    return this.audiencePort.findEmailsForNewMatch({
      matchId: match.id,
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
    });
  }

  private findFansOfMatch(match: Match): Promise<string[]> {
    if (!this.audiencePort) return Promise.resolve([]);
    return this.audiencePort.findEmailsForMatchUpdate({
      matchId: match.id,
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
    });
  }
}
