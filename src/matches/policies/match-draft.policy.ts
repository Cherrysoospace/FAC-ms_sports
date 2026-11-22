import { Match } from '../entities/match.entity';
import { Phase } from '../../phases/entities/phase.entity';
import { CreateMatchDto } from '../dto/create-match.dto';
import { UpdateMatchDto } from '../dto/update-match.dto';
import { PlayablePeriod } from './match-rules.policy';

// Lo que se valida al crear o al editar: los valores finales del partido.
export interface MatchDraft {
  homeTeamId: number;
  awayTeamId: number;
  venueId: number;
  ballId: number;
  scheduledAt: Date;
}

export type MatchDataChanges = Pick<
  UpdateMatchDto,
  'homeTeamId' | 'awayTeamId' | 'venueId' | 'ballId' | 'scheduledAt'
>;

/**
 * Valores del partido sobre los que se aplican las reglas (HU-GC-06).
 * Funciones puras: no consultan la base ni lanzan errores.
 */
export class MatchDraftPolicy {
  // ¿El PATCH cambia equipos, escenario, pelota o fecha?
  static changesData(dto: MatchDataChanges): boolean {
    return (
      dto.homeTeamId !== undefined ||
      dto.awayTeamId !== undefined ||
      dto.venueId !== undefined ||
      dto.ballId !== undefined ||
      dto.scheduledAt !== undefined
    );
  }

  static fromCreate(dto: CreateMatchDto): MatchDraft {
    return {
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      venueId: dto.venueId,
      ballId: dto.ballId,
      scheduledAt: new Date(dto.scheduledAt),
    };
  }

  // Valores finales al editar: lo que llega en el PATCH o, si no, lo actual.
  static mergeForUpdate(match: Match, dto: MatchDataChanges): MatchDraft {
    return {
      homeTeamId: dto.homeTeamId ?? match.homeTeam.id,
      awayTeamId: dto.awayTeamId ?? match.awayTeam.id,
      venueId: dto.venueId ?? match.venue.id,
      ballId: dto.ballId ?? match.ball.id,
      scheduledAt: dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : match.scheduledAt,
    };
  }

  // Fechas de la fase si las tiene; si no, las del torneo.
  static playablePeriod(phase: Phase): PlayablePeriod {
    if (phase.startDate && phase.endDate) {
      return {
        startDate: phase.startDate,
        endDate: phase.endDate,
        label: `las fechas de la fase ${phase.name}`,
      };
    }
    return {
      startDate: phase.tournament.startDate,
      endDate: phase.tournament.endDate,
      label: `las fechas del torneo ${phase.tournament.name}`,
    };
  }
}
