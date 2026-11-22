import { Injectable } from '@nestjs/common';
import { Match } from '../entities/match.entity';
import { MatchesRepository } from '../repositories/matches.repository';
import { MatchRulesPolicy } from '../policies/match-rules.policy';
import { MatchDraft, MatchDraftPolicy } from '../policies/match-draft.policy';
import { Phase } from '../../phases/entities/phase.entity';
import { GroupPhase } from '../../phases/entities/group-phase.entity';
import { Team } from '../../teams/entities/team.entity';
import { Venue } from '../../venues/entities/venue.entity';
import { TeamsService } from '../../teams/teams.service';
import { VenuesService } from '../../venues/venues.service';
import { BallsService } from '../../balls/balls.service';
import { TournamentVenuesService } from '../../tournament-venues/tournament-venues.service';
import {
  ApplicationException,
  ErrorCase,
  ResourceNotFoundException,
} from '../../common/exceptions';

export type ResolvedMatchDraft = Pick<
  Match,
  'homeTeam' | 'awayTeam' | 'venue' | 'ball' | 'scheduledAt'
>;

/**
 * HU-GC-06: valida los valores finales de un partido (al crear o editar) y
 * devuelve sus entidades. Pregunta a los dueños de cada regla: TeamsService
 * (equipo activo), VenuesService (escenario), TournamentVenuesService
 * (habilitado para el torneo) y BallsService (pelota libre).
 * Solo cambia si cambian las condiciones para programar un partido.
 */
@Injectable()
export class MatchDraftResolver {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly teamsService: TeamsService,
    private readonly venuesService: VenuesService,
    private readonly ballsService: BallsService,
    private readonly tournamentVenuesService: TournamentVenuesService,
  ) {}

  // La fase debe existir y su torneo no puede estar finalizado ni cancelado.
  async getOpenPhaseOrFail(phaseId: number): Promise<Phase> {
    const phase = await this.matchesRepository.findPhase(phaseId);
    if (!phase) throw ResourceNotFoundException.of('Fase', phaseId);
    MatchRulesPolicy.assertTournamentOpen(
      phase.tournament,
      'no se le pueden programar partidos',
    );
    return phase;
  }

  /**
   * Equipos distintos, activos e inscritos (y del grupo, si la fase es de
   * grupos), escenario activo y habilitado para el torneo, pelota libre y
   * fecha dentro de la fase o del torneo.
   */
  async resolve(
    phase: Phase,
    draft: MatchDraft,
    matchId?: number,
  ): Promise<ResolvedMatchDraft> {
    MatchRulesPolicy.assertDifferentTeams(draft.homeTeamId, draft.awayTeamId);
    MatchRulesPolicy.assertWithinPeriod(
      draft.scheduledAt,
      MatchDraftPolicy.playablePeriod(phase),
    );

    const [homeTeam, awayTeam] = await Promise.all([
      this.getEligibleTeamOrFail(draft.homeTeamId, phase),
      this.getEligibleTeamOrFail(draft.awayTeamId, phase),
    ]);
    const venue = await this.getEnabledVenueOrFail(draft.venueId, phase);
    const ball = await this.ballsService.getAvailableBallOrFail(
      draft.ballId,
      matchId,
    );

    return { homeTeam, awayTeam, venue, ball, scheduledAt: draft.scheduledAt };
  }

  private async getEligibleTeamOrFail(
    teamId: number,
    phase: Phase,
  ): Promise<Team> {
    const team = await this.teamsService.getActiveTeamOrFail(teamId);
    const tournament = phase.tournament;

    if (!(await this.matchesRepository.isRegistered(team.id, tournament.id))) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo ${team.name} no está inscrito en el torneo ${tournament.name}`,
      );
    }
    if (phase instanceof GroupPhase && team.group?.id !== phase.id) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El equipo ${team.name} no pertenece al grupo ${phase.groupName}`,
      );
    }
    return team;
  }

  private async getEnabledVenueOrFail(
    venueId: number,
    phase: Phase,
  ): Promise<Venue> {
    const venue = await this.venuesService.getVenueOrFail(venueId);
    if (!venue.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario ${venue.name} está inactivo`,
      );
    }
    const enabled =
      await this.tournamentVenuesService.isVenueEnabledForTournament(
        phase.tournament.id,
        venue.id,
      );
    if (!enabled) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El escenario ${venue.name} no está habilitado para el torneo ${phase.tournament.name}`,
      );
    }
    return venue;
  }
}
