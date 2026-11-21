/**
 * Token de inyección para desacoplar `LocationsService` del módulo `tickets` (DIP).
 */
export const TICKET_CAPACITY_PORT = Symbol('TICKET_CAPACITY_PORT');

/**
 * Puerto de consulta de ocupación de boletos por localidad.
 * Permite a `LocationsService` proteger el aforo y responder `409 Conflict`
 * al eliminar localidades con boletos, sin acoplarse a `TicketsRepository`.
 */
export interface ITicketCapacityPort {
  /** Total de boletos emitidos asociados a la localidad (impide eliminar si > 0). */
  countByLocationId(locationId: number): Promise<number>;

  /**
   * Máximo número de boletos emitidos para la localidad en un mismo partido
   * (impide reducir `location.capacity` por debajo de lo ya vendido en un partido).
   */
  maxSoldPerMatchByLocationId(locationId: number): Promise<number>;
}

