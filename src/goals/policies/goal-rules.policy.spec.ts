import { GoalRulesPolicy } from './goal-rules.policy';
import { ContractStage } from '../../team-players/enums/contract-stage.enum';
import { ContractStatus } from '../../team-players/enums/contract-status.enum';
import type { TeamPlayerResponseDto } from '../../team-players/dto/team-player-response.dto';

const matchFixture = {
  scheduledAt: new Date(2026, 10, 20, 18, 0),
  homeTeam: { id: 10, name: 'Nacional' },
  awayTeam: { id: 20, name: 'Millonarios' },
} as Parameters<typeof GoalRulesPolicy.assertPlayerParticipates>[2];

function makeContract(
  overrides: Partial<{
    teamId: number;
    startDate: string;
    endDate: string;
    status: ContractStatus;
    stage: ContractStage;
    releaseDate: string | null;
  }> = {},
): TeamPlayerResponseDto {
  return {
    id: 1,
    team: {
      id: overrides.teamId ?? 10,
      name: 'Nacional',
      city: 'Medellín',
      modality: 'MALE',
    },
    player: {
      id: 7,
      fullName: 'Carlos Gómez',
      documentNumber: '123456',
      position: 'DEL',
      age: 24,
    },
    startDate: overrides.startDate ?? '2026-01-01',
    endDate: overrides.endDate ?? '2026-12-31',
    status: overrides.status ?? ContractStatus.ACTIVE,
    stage: overrides.stage ?? ContractStage.CURRENT,
    releaseDate: overrides.releaseDate ?? null,
    releaseReason: null,
  } as TeamPlayerResponseDto;
}

describe('GoalRulesPolicy', () => {
  it('permite anotación cuando el jugador tiene contrato vigente en el equipo local o visitante', () => {
    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates(
        'Carlos Gómez',
        [makeContract({ teamId: 10, stage: ContractStage.CURRENT })],
        matchFixture,
      ),
    ).not.toThrow();

    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates(
        'Carlos Gómez',
        [makeContract({ teamId: 20, stage: ContractStage.CURRENT })],
        matchFixture,
      ),
    ).not.toThrow();
  });

  it('permite anotación cuando el contrato cubre la fecha exacta del partido aunque no esté vigente hoy', () => {
    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates(
        'Carlos Gómez',
        [
          makeContract({
            teamId: 20,
            startDate: '2026-11-01',
            endDate: '2026-11-25',
            stage: ContractStage.PAST,
          }),
        ],
        matchFixture,
      ),
    ).not.toThrow();
  });

  it('permite anotación si el contrato retirado estuvo vigente en la fecha del partido', () => {
    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates(
        'Carlos Gómez',
        [
          makeContract({
            teamId: 10,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            status: ContractStatus.RELEASED,
            stage: ContractStage.PAST,
            releaseDate: '2026-11-20',
          }),
        ],
        matchFixture,
      ),
    ).not.toThrow();
  });

  it('rechaza si el jugador fue retirado antes de la fecha del partido', () => {
    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates(
        'Carlos Gómez',
        [
          makeContract({
            teamId: 10,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            status: ContractStatus.RELEASED,
            stage: ContractStage.PAST,
            releaseDate: '2026-11-19',
          }),
        ],
        matchFixture,
      ),
    ).toThrow('no pertenece a ninguno de los equipos participantes');
  });

  it('rechaza si el jugador pertenece a otro equipo o no tiene contratos', () => {
    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates(
        'Carlos Gómez',
        [makeContract({ teamId: 99, stage: ContractStage.CURRENT })],
        matchFixture,
      ),
    ).toThrow('Nacional vs Millonarios');

    expect(() =>
      GoalRulesPolicy.assertPlayerParticipates('Carlos Gómez', [], matchFixture),
    ).toThrow('no pertenece a ninguno de los equipos participantes');
  });
});
