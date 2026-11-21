import type { DataSource } from 'typeorm';
import { BetStatus } from '../../bets/enums/bet-status.enum';
import { MatchAudienceRepository } from './match-audience.repository';

describe('MatchAudienceRepository', () => {
  let repository: MatchAudienceRepository;
  const dataSource = {
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MatchAudienceRepository(
      dataSource as unknown as DataSource,
    );
  });

  it('consulta en una sola sentencia y deduplica correos en memoria al programar partido', async () => {
    dataSource.query.mockResolvedValueOnce([
      { email: ' Ana@UC.edu.co ' },
      { email: 'ana@uc.edu.co' },
      { email: 'carlos@uc.edu.co' },
      { email: null },
      { email: '   ' },
    ]);

    const emails = await repository.findEmailsForNewMatch({
      matchId: 25,
      homeTeamId: 3,
      awayTeamId: 7,
    });

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('UNION'),
      [25, 3, 7, 3, 7, 25, BetStatus.CANCELLED, 3, 7, 3, 7, 3, 7],
    );
    expect(emails).toEqual(['ana@uc.edu.co', 'carlos@uc.edu.co']);
  });

  it('consulta boletos, apuestas activas y favoritos del partido al notificar eventos', async () => {
    dataSource.query.mockResolvedValueOnce([
      { email: 'LAURA@CORREO.COM' },
      { email: 'laura@correo.com' },
      { email: 'pedro@correo.com' },
    ]);

    const emails = await repository.findEmailsForMatchUpdate({
      matchId: 25,
      homeTeamId: 3,
      awayTeamId: 7,
    });

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('t.match_id = ?'),
      [25, 25, BetStatus.CANCELLED, 3, 7],
    );
    expect(emails).toEqual(['laura@correo.com', 'pedro@correo.com']);
  });
});

