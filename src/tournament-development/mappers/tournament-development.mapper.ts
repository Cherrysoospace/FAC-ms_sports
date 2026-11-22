import { Tournament } from '../../tournaments/entities/tournament.entity';
import { GroupPhase } from '../../phases/entities/group-phase.entity';
import { GroupParticipant } from '../policies/group-participants.policy';
import { Match } from '../../matches/entities/match.entity';
import { Goal } from '../../goals/entities/goal.entity';
import { MatchMapper } from '../../matches/mappers/match.mapper';
import { groupBy } from '../../common/collections/group-by';
import { MatchOutcomePolicy } from '../policies/match-outcome.policy';
import { StandingRow } from '../policies/standings-calculator';
import { BracketRound, BracketTie } from '../policies/bracket-builder';
import { DevelopmentSummary } from '../policies/development-summary.policy';
import { CurrentPhase } from '../policies/current-phase.policy';
import { EliminatedTeam } from '../policies/eliminated-teams.policy';
import {
  DevelopmentFinalRoundDto,
  DevelopmentGoalDto,
  DevelopmentGroupDto,
  DevelopmentGroupStageDto,
  DevelopmentMatchDto,
  DevelopmentPhaseDto,
  DevelopmentRefDto,
  DevelopmentStandingDto,
  DevelopmentSummaryDto,
  DevelopmentTieDto,
  DevelopmentTournamentDto,
  TournamentDevelopmentResponseDto,
} from '../dto/tournament-development-response.dto';

// Todo lo que el servicio ya consultó y calculó; el mapper solo da forma.
export interface TournamentDevelopmentView {
  tournament: Tournament;
  summary: DevelopmentSummary & {
    currentPhase: CurrentPhase | null;
    eliminatedTeams: EliminatedTeam[];
  };
  groups: GroupPhase[];
  // Participantes de cada grupo (GroupParticipantsPolicy)
  teamsByGroup: ReadonlyMap<number, GroupParticipant[]>;
  standingsByGroup: ReadonlyMap<number, StandingRow[]>;
  matchesByPhase: ReadonlyMap<number, Match[]>;
  bracket: BracketRound<Match>[];
  goalsByMatch: ReadonlyMap<number, Goal[]>;
  // Equipo de cada anotación por id de anotación (ScoringTeamResolver)
  goalTeams: ReadonlyMap<number, { id: number; name: string } | null>;
}

export class TournamentDevelopmentMapper {
  static toResponseDto(
    view: TournamentDevelopmentView,
  ): TournamentDevelopmentResponseDto {
    const dto = new TournamentDevelopmentResponseDto();
    dto.tournament = TournamentDevelopmentMapper.toTournamentDto(
      view.tournament,
    );
    dto.summary = Object.assign(new DevelopmentSummaryDto(), view.summary, {
      currentPhase: view.summary.currentPhase
        ? { ...view.summary.currentPhase }
        : null,
      eliminatedTeams: view.summary.eliminatedTeams.map((team) =>
        TournamentDevelopmentMapper.toRef(team),
      ),
    });

    const phases: DevelopmentPhaseDto[] = [
      ...TournamentDevelopmentMapper.toGroupStages(view),
      ...view.bracket.map((round) =>
        TournamentDevelopmentMapper.toFinalRoundDto(round, view),
      ),
    ];
    // sort es estable: las rondas con el mismo orden (THIRD_PLACE y FINAL)
    // conservan el orden de BracketBuilder.
    dto.phases = phases.sort((a, b) => a.order - b.order);
    return dto;
  }

  private static toTournamentDto(
    tournament: Tournament,
  ): DevelopmentTournamentDto {
    const dto = new DevelopmentTournamentDto();
    dto.id = tournament.id;
    dto.name = tournament.name;
    dto.sport = TournamentDevelopmentMapper.toRef(tournament.sport);
    dto.status = tournament.status;
    dto.startDate = tournament.startDate;
    dto.endDate = tournament.endDate;
    dto.registrationOpensAt = tournament.registrationOpensAt;
    dto.registrationClosesAt = tournament.registrationClosesAt;
    dto.active = tournament.active;
    return dto;
  }

  // Los grupos con el mismo orden forman una sola fase de grupos.
  private static toGroupStages(
    view: TournamentDevelopmentView,
  ): DevelopmentGroupStageDto[] {
    const byOrder = groupBy(view.groups, (group) => group.order);
    return [...byOrder.entries()].map(([order, groups]) => {
      const stage = new DevelopmentGroupStageDto();
      stage.type = 'GROUP';
      stage.order = order;
      stage.name = groups[0].name;
      stage.startDate = groups[0].startDate ?? null;
      stage.endDate = groups[0].endDate ?? null;
      stage.groups = groups.map((group) =>
        TournamentDevelopmentMapper.toGroupDto(group, view),
      );
      return stage;
    });
  }

  private static toGroupDto(
    group: GroupPhase,
    view: TournamentDevelopmentView,
  ): DevelopmentGroupDto {
    const dto = new DevelopmentGroupDto();
    dto.id = group.id;
    dto.groupName = group.groupName;
    dto.label = MatchMapper.phaseLabel(group);
    dto.qualifiersCount = group.qualifiersCount ?? null;
    dto.teams = (view.teamsByGroup.get(group.id) ?? []).map((team) =>
      TournamentDevelopmentMapper.toRef(team),
    );
    dto.standings = (view.standingsByGroup.get(group.id) ?? []).map((row) =>
      TournamentDevelopmentMapper.toStandingDto(row),
    );
    dto.matches = (view.matchesByPhase.get(group.id) ?? []).map((match) =>
      TournamentDevelopmentMapper.toMatchDto(match, view),
    );
    return dto;
  }

  private static toFinalRoundDto(
    round: BracketRound<Match>,
    view: TournamentDevelopmentView,
  ): DevelopmentFinalRoundDto {
    const dto = new DevelopmentFinalRoundDto();
    dto.type = 'FINAL';
    dto.id = round.phase.id;
    dto.order = round.phase.order;
    dto.name = round.phase.name;
    dto.round = round.phase.round;
    dto.label = MatchMapper.phaseLabel(round.phase);
    dto.startDate = round.phase.startDate ?? null;
    dto.endDate = round.phase.endDate ?? null;
    dto.ties = round.ties.map((tie) =>
      TournamentDevelopmentMapper.toTieDto(tie, view),
    );
    return dto;
  }

  private static toTieDto(
    tie: BracketTie<Match>,
    view: TournamentDevelopmentView,
  ): DevelopmentTieDto {
    const dto = new DevelopmentTieDto();
    dto.teamA = TournamentDevelopmentMapper.toRef(tie.teamA);
    dto.teamB = TournamentDevelopmentMapper.toRef(tie.teamB);
    dto.teamAScore = tie.teamAScore;
    dto.teamBScore = tie.teamBScore;
    dto.winner = tie.winner
      ? TournamentDevelopmentMapper.toRef(tie.winner)
      : null;
    dto.matches = tie.matches.map((match) =>
      TournamentDevelopmentMapper.toMatchDto(match, view),
    );
    return dto;
  }

  private static toMatchDto(
    match: Match,
    view: TournamentDevelopmentView,
  ): DevelopmentMatchDto {
    const dto = new DevelopmentMatchDto();
    dto.id = match.id;
    dto.scheduledAt = match.scheduledAt;
    dto.status = match.status;
    dto.homeTeam = TournamentDevelopmentMapper.toRef(match.homeTeam);
    dto.awayTeam = TournamentDevelopmentMapper.toRef(match.awayTeam);
    dto.homeScore = match.homeScore ?? null;
    dto.awayScore = match.awayScore ?? null;
    dto.hasResult = MatchOutcomePolicy.hasResult(match);
    dto.venue = TournamentDevelopmentMapper.toRef(match.venue);
    dto.goals = (view.goalsByMatch.get(match.id) ?? []).map((goal) =>
      TournamentDevelopmentMapper.toGoalDto(goal, view),
    );
    return dto;
  }

  private static toGoalDto(
    goal: Goal,
    view: TournamentDevelopmentView,
  ): DevelopmentGoalDto {
    const dto = new DevelopmentGoalDto();
    dto.id = goal.id;
    dto.minute = goal.minute;
    dto.points = goal.points;
    dto.description = goal.description ?? null;
    dto.player = { id: goal.player.id, fullName: goal.player.fullName };
    const team = view.goalTeams.get(goal.id);
    dto.team = team ? TournamentDevelopmentMapper.toRef(team) : null;
    return dto;
  }

  private static toStandingDto(row: StandingRow): DevelopmentStandingDto {
    return Object.assign(new DevelopmentStandingDto(), {
      ...row,
      team: TournamentDevelopmentMapper.toRef(row.team),
    });
  }

  private static toRef(entity: {
    id: number;
    name: string;
  }): DevelopmentRefDto {
    const dto = new DevelopmentRefDto();
    dto.id = entity.id;
    dto.name = entity.name;
    return dto;
  }
}
