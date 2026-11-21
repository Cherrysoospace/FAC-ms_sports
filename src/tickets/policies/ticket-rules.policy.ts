import { randomBytes } from 'node:crypto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
} from '../../common/exceptions';
import { MatchStatus } from '../../matches/enums/match-status.enum';
import { MATCH_STATUS_LABELS } from '../../matches/policies/match-rules.policy';

/**
 * Reglas puras de negocio para emisión y gestión de boletos (R15, R16).
 */
export class TicketRulesPolicy {
  static assertMatchPurchasable(status: MatchStatus): void {
    if (status !== MatchStatus.SCHEDULED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El partido está ${MATCH_STATUS_LABELS[status]}: solo se pueden comprar boletos para partidos programados`,
      );
    }
  }

  static assertLocationActive(active: boolean, locationName: string): void {
    if (!active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad ${locationName} está inactiva`,
      );
    }
  }

  static assertLocationBelongsToMatchVenue(
    locationVenueId: number,
    matchVenueId: number,
    locationName: string,
    venueName: string,
  ): void {
    if (locationVenueId !== matchVenueId) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `La localidad ${locationName} no pertenece al escenario ${venueName} del partido`,
      );
    }
  }

  static assertCapacityAvailable(
    sold: number,
    capacity: number,
    locationName: string,
  ): void {
    if (sold >= capacity) {
      throw new BusinessRuleException(
        `No hay boletos disponibles en la localidad ${locationName} (aforo completo: ${capacity})`,
      );
    }
  }

  static assertTicketDeletable(status: MatchStatus): void {
    if (status === MatchStatus.IN_PROGRESS || status === MatchStatus.FINISHED) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No se puede anular o eliminar un boleto de un partido ${MATCH_STATUS_LABELS[status]}`,
      );
    }
  }

  static generateCode(matchId: number, locationId: number): string {
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    return `TKT-M${matchId}-L${locationId}-${suffix}`;
  }
}

