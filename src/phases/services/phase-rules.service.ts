import { Injectable } from '@nestjs/common';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TournamentStatusPolicy } from '../../tournaments/policies/tournament-status.policy';
import { PhasesRepository } from '../repositories/phases.repository';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
} from '../../common/exceptions';

export type PhaseKind = 'GROUP' | 'FINAL';

// Tipo de fase que no puede compartir order con cada tipo.
interface OrderConflict {
  // Cuántas fases del tipo en conflicto hay en ese torneo y order
  count: (
    tournamentId: number,
    order: number,
    excludeId?: number,
  ) => Promise<number>;
  // Cómo se nombra en el mensaje: "El orden N ya pertenece a <label>"
  label: string;
}

// Reglas comunes a grupos y fases finales.
@Injectable()
export class PhaseRulesService {
  /**
   * Para agregar un tipo de fase basta con una entrada nueva en este mapa;
   * assertOrderType no cambia.
   */
  private readonly orderConflicts: Record<PhaseKind, OrderConflict> = {
    GROUP: {
      count: (tournamentId, order, excludeId) =>
        this.phasesRepository.countFinalsInOrder(
          tournamentId,
          order,
          excludeId,
        ),
      label: 'una fase final',
    },
    FINAL: {
      count: (tournamentId, order, excludeId) =>
        this.phasesRepository.countGroupsInOrder(
          tournamentId,
          order,
          excludeId,
        ),
      label: 'una fase de grupos',
    },
  };

  constructor(private readonly phasesRepository: PhasesRepository) {}

  // Las fases de un torneo cerrado (FINISHED o CANCELLED) ya no se modifican.
  assertTournamentEditable(tournament: Tournament): void {
    if (TournamentStatusPolicy.isClosed(tournament.status)) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'No se pueden modificar las fases de un torneo finalizado o cancelado',
      );
    }
  }

  // Fechas YYYY-MM-DD (se comparan como texto). null/undefined = sin fecha.
  assertDatesInsideTournament(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    tournament: Tournament,
  ): void {
    if (startDate && endDate && startDate > endDate) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'La fecha de inicio de la fase debe ser igual o anterior a su fecha de fin',
      );
    }

    const range = `${tournament.startDate} a ${tournament.endDate}`;
    const checks: [string, string | null | undefined][] = [
      ['inicio', startDate],
      ['fin', endDate],
    ];
    for (const [label, date] of checks) {
      if (date && (date < tournament.startDate || date > tournament.endDate)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `La fecha de ${label} de la fase (${date}) debe estar dentro de ` +
            `las fechas del torneo (${range})`,
        );
      }
    }
  }

  // Un mismo order no puede tener grupos y fases finales a la vez.
  async assertOrderType(
    tournamentId: number,
    order: number,
    type: PhaseKind,
    excludeId?: number,
  ): Promise<void> {
    const conflict = this.orderConflicts[type];
    if ((await conflict.count(tournamentId, order, excludeId)) > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El orden ${order} ya pertenece a ${conflict.label}`,
      );
    }
  }

  // `name` describe la fase en el mensaje, ej. 'el grupo A'.
  async assertNoMatches(phaseId: number, name: string): Promise<void> {
    const matches = await this.phasesRepository.countMatches(phaseId);
    if (matches > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar ${name} porque tiene ${matches} ` +
          `${matches === 1 ? 'partido asociado' : 'partidos asociados'}`,
      );
    }
  }
}
