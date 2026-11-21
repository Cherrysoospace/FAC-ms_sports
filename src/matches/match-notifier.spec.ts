import type { IMatchAudiencePort } from '../common/contracts';
import { Goal } from '../goals/entities/goal.entity';
import { GroupPhase } from '../phases/entities/group-phase.entity';
import type { NotificationsService } from '../notifications/notifications.service';
import { Match } from './entities/match.entity';
import { MatchNotifier } from './match-notifier';

function createMatch(): Match {
  const phase = Object.assign(new GroupPhase(), {
    id: 4,
    name: 'Grupos',
    groupName: 'A',
    tournament: { id: 1, name: 'Torneo Apertura' },
  });

  return {
    id: 10,
    scheduledAt: new Date('2026-11-22T18:00:00.000Z'),
    homeScore: 2,
    awayScore: 1,
    phase,
    homeTeam: { id: 1, name: 'Leones' },
    awayTeam: { id: 2, name: 'Tigres' },
    venue: { id: 3, name: 'Estadio Central' },
  } as unknown as Match;
}

describe('MatchNotifier', () => {
  const notificationsService = {
    notify: jest.fn(async () => 1),
  };
  let findEmailsForNewMatch: jest.Mock;
  let findEmailsForMatchUpdate: jest.Mock;
  let audiencePort: IMatchAudiencePort;

  let notifier: MatchNotifier;

  beforeEach(() => {
    jest.clearAllMocks();
    findEmailsForNewMatch = jest.fn();
    findEmailsForMatchUpdate = jest.fn();
    audiencePort = {
      findEmailsForNewMatch,
      findEmailsForMatchUpdate,
    };
    notifier = new MatchNotifier(
      notificationsService as unknown as NotificationsService,
      audiencePort,
    );
  });

  it('notifica al programar un partido usando los destinatarios reales de IMatchAudiencePort', async () => {
    findEmailsForNewMatch.mockResolvedValueOnce([
      'ana@correo.com',
      'luis@correo.com',
    ]);

    await notifier.notifyNewMatch(createMatch());

    expect(findEmailsForNewMatch).toHaveBeenCalledWith({
      matchId: 10,
      homeTeamId: 1,
      awayTeamId: 2,
    });
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['ana@correo.com', 'luis@correo.com'],
        subject: 'Nuevo partido: Leones vs Tigres',
      }),
    );
  });

  it('notifica resultado final y anotaciones a la audiencia del partido', async () => {
    findEmailsForMatchUpdate.mockResolvedValue(['fan@correo.com']);

    await notifier.notifyMatchResult(createMatch(), true);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['fan@correo.com'],
        subject: 'Resultado final: Leones 2 - 1 Tigres',
      }),
    );

    const goal = Object.assign(new Goal(), {
      id: 9,
      minute: 42,
      points: 1,
      description: 'Gol de tiro libre',
      player: { fullName: 'Carlos Pérez' },
    });
    await notifier.notifyGoalRecorded(createMatch(), goal);
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['fan@correo.com'],
        subject: "Nueva anotación en Leones vs Tigres (Carlos Pérez, 42')",
      }),
    );
  });

  it('omite el envío de correo cuando la audiencia está vacía', async () => {
    findEmailsForNewMatch.mockResolvedValueOnce([]);
    findEmailsForMatchUpdate.mockResolvedValueOnce([]);

    await notifier.notifyNewMatch(createMatch());
    await notifier.notifyMatchResult(createMatch(), false);

    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});
