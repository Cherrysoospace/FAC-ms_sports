import { Injectable } from '@nestjs/common';
import { TournamentsService } from '../tournaments/tournaments.service';
import { Match } from '../matches/entities/match.entity';
import { Goal } from '../goals/entities/goal.entity';
import { groupBy } from '../common/collections/group-by';
import {
  TournamentDevelopmentData,
  TournamentDevelopmentRepository,
} from './repositories/tournament-development.repository';
import {
  StandingRow,
  StandingsCalculator,
} from './policies/standings-calculator';
import { BracketBuilder } from './policies/bracket-builder';
import {
  ScoringTeam,
  ScoringTeamResolver,
} from './policies/scoring-team.resolver';
import { DevelopmentSummaryPolicy } from './policies/development-summary.policy';
import { CurrentPhasePolicy } from './policies/current-phase.policy';
import { EliminatedTeamsPolicy } from './policies/eliminated-teams.policy';
import {
  GroupParticipant,
  GroupParticipantsPolicy,
} from './policies/group-participants.policy';
import {
  TournamentDevelopmentMapper,
  TournamentDevelopmentView,
} from './mappers/tournament-development.mapper';
import { TournamentDevelopmentResponseDto } from './dto/tournament-development-response.dto';

/**
 * HU-GC-08b: consultar la estructura y el desarrollo de un torneo.
 * Solo orquesta: torneo (404) → repositorio → políticas → mapper.
 */
@Injectable()
export class TournamentDevelopmentService {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly developmentRepository: TournamentDevelopmentRepository,
  ) {}

  async getDevelopment(
    tournamentId: number,
  ): Promise<TournamentDevelopmentResponseDto> {
    // 404 'Torneo con id X no existe' (mismo mensaje que /tournaments/:id)
    const tournament =
      await this.tournamentsService.getTournamentOrFail(tournamentId);
    const data = await this.developmentRepository.loadByTournament(
      tournament.id,
    );

    const matchesByPhase = groupBy(data.matches, (match) => match.phase.id);
    const teamsByGroup = this.participantsByGroup(data, matchesByPhase);
    const standingsByGroup = new Map(
      data.groups.map((group) => [
        group.id,
        StandingsCalculator.calculate(
          teamsByGroup.get(group.id) ?? [],
          matchesByPhase.get(group.id) ?? [],
        ),
      ]),
    );

    return TournamentDevelopmentMapper.toResponseDto({
      tournament,
      summary: this.buildSummary(data, matchesByPhase, standingsByGroup),
      groups: data.groups,
      teamsByGroup,
      standingsByGroup,
      matchesByPhase,
      bracket: BracketBuilder.build(data.finals, matchesByPhase),
      goalsByMatch: groupBy(data.goals, (goal) => goal.match.id),
      goalTeams: this.resolveGoalTeams(data),
    });
  }

  // Equipos asignados al grupo + los que jugaron sus partidos (GroupParticipantsPolicy).
  private participantsByGroup(
    data: TournamentDevelopmentData,
    matchesByPhase: ReadonlyMap<number, Match[]>,
  ): Map<number, GroupParticipant[]> {
    const assignedByGroup = groupBy(data.teams, (team) => team.group?.id ?? 0);
    return new Map(
      data.groups.map((group) => [
        group.id,
        GroupParticipantsPolicy.resolve(
          assignedByGroup.get(group.id) ?? [],
          matchesByPhase.get(group.id) ?? [],
        ),
      ]),
    );
  }

  // Conteos, fase actual y eliminados, con lo que ya se consultó y calculó.
  private buildSummary(
    data: TournamentDevelopmentData,
    matchesByPhase: ReadonlyMap<number, Match[]>,
    standingsByGroup: ReadonlyMap<number, StandingRow[]>,
  ): TournamentDevelopmentView['summary'] {
    return {
      ...DevelopmentSummaryPolicy.summarize(
        data.activeRegistrationsCount,
        data.matches,
        data.goals.length,
      ),
      currentPhase: CurrentPhasePolicy.resolve(
        data.groups,
        data.finals,
        matchesByPhase,
      ),
      eliminatedTeams: EliminatedTeamsPolicy.resolve(
        data.groups.map((group) => ({
          qualifiersCount: group.qualifiersCount,
          standings: standingsByGroup.get(group.id) ?? [],
          matches: matchesByPhase.get(group.id) ?? [],
        })),
        data.finals.map((final) => matchesByPhase.get(final.id) ?? []),
      ),
    };
  }

  private resolveGoalTeams(
    data: TournamentDevelopmentData,
  ): Map<number, ScoringTeam | null> {
    const matchesById = new Map<number, Match>(
      data.matches.map((match) => [match.id, match]),
    );
    return new Map(
      data.goals.map((goal: Goal) => {
        const match = matchesById.get(goal.match.id);
        const team = match
          ? ScoringTeamResolver.resolve(match, goal.player.teamPlayers ?? [])
          : null;
        return [goal.id, team];
      }),
    );
  }
}
