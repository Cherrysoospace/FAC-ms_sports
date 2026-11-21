/**
 * Token de inyección para desacoplar `MatchNotifier` de los módulos `fans`,
 * `tickets` y `bets` al resolver destinatarios de correo (DIP).
 */
export const MATCH_AUDIENCE_PORT = Symbol('MATCH_AUDIENCE_PORT');

/**
 * Criterios de búsqueda para obtener los correos únicos de aficionados interesados
 * en un partido (por boleto, apuesta o equipo favorito).
 */
export interface MatchAudienceQuery {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
}

/**
 * Puerto de audiencia de un partido para `MatchNotifier`.
 * Las implementaciones deben resolver destinatarios sin consultas N+1 y
 * deduplicar correos en memoria (`Set<string>`).
 */
export interface IMatchAudiencePort {
  /**
   * Correos únicos de aficionados a notificar al programar un partido nuevo
   * (boleto/apuesta en partidos previos de los equipos o equipo favorito).
   */
  findEmailsForNewMatch(query: MatchAudienceQuery): Promise<string[]>;

  /**
   * Correos únicos de aficionados a notificar ante eventos del partido
   * (resultado final, anotaciones o cancelación).
   */
  findEmailsForMatchUpdate(query: MatchAudienceQuery): Promise<string[]>;
}

