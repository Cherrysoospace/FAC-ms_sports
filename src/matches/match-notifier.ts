import { Injectable, Logger } from '@nestjs/common';
import { Match } from './entities/match.entity';
import { MatchMapper } from './mappers/match.mapper';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * HU-GC-06: al crear un partido se avisa por correo a los aficionados que
 * participaron (boleto o apuesta) en partidos anteriores de los equipos
 * enfrentados. Separado de MatchesService para que el correo no mezcle
 * responsabilidades con la gestión del partido.
 */
@Injectable()
export class MatchNotifier {
  private readonly logger = new Logger(MatchNotifier.name);

  constructor(private readonly notificationsService: NotificationsService) {}

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

  /**
   * Correos de los aficionados con boleto o apuesta en partidos anteriores
   * (distintos de `match`) de cualquiera de los dos equipos.
   *
   * TODO (Fercho): cuando existan Boleto, Apuesta y Aficionado, consultar aquí
   * (en un repositorio) los correos distintos de esos aficionados. Mientras
   * tanto no hay a quién avisar.
   */
  private findFansOfPreviousMatches(match: Match): Promise<string[]> {
    void match;
    return Promise.resolve([]);
  }
}
