import { Injectable } from '@nestjs/common';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';
import { PhasesRepository } from '../repositories/phases.repository';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
} from '../../common/exceptions';

export type PhaseKind = 'GROUP' | 'FINAL';

// Torneos cuyas fases ya no se pueden modificar.
export const CLOSED_TOURNAMENT_STATUSES: TournamentStatus[] = [
  TournamentStatus.FINISHED,
  TournamentStatus.CANCELLED,
];

// Reglas comunes a grupos y fases finales.
@Injectable()
export class PhaseRulesService {
  constructor(private readonly phasesRepository: PhasesRepository) {}

  assertTournamentEditable(tournament: Tournament): void {
    if (CLOSED_TOURNAMENT_STATUSES.includes(tournament.status)) {
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
      if (
        date &&
        (date < tournament.startDate || date > tournament.endDate)
      ) {
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
    if (type === 'GROUP') {
      const finals = await this.phasesRepository.countFinalsInOrder(
        tournamentId,
        order,
        excludeId,
      );
      if (finals > 0) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          `El orden ${order} ya pertenece a una fase final`,
        );
      }
      return;
    }

    const groups = await this.phasesRepository.countGroupsInOrder(
      tournamentId,
      order,
      excludeId,
    );
    if (groups > 0) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El orden ${order} ya pertenece a una fase de grupos`,
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
