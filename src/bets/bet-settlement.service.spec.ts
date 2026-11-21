import type { EntityManager } from 'typeorm';
import type { BetNotifier } from './bet-notifier';
import { BetSettlementService } from './bet-settlement.service';
import { Bet } from './entities/bet.entity';
import { BetSelection } from './enums/bet-selection.enum';
import { BetStatus } from './enums/bet-status.enum';
import type { BetsRepository } from './repositories/bets.repository';

function createPendingBet(
  id: number,
  selection: BetSelection,
  amount: string,
  odds: string,
  email: string,
): Bet {
  return Object.assign(new Bet(), {
    id,
    selection,
    amount,
    odds,
    status: BetStatus.PENDING,
    payout: null,
    fan: { id: id * 10, email },
    match: {
      id: 10,
      homeTeam: { id: 1, name: 'Leones' },
      awayTeam: { id: 2, name: 'Tigres' },
    },
    fanPaymentMethod: {
      id: 3,
      alias: 'Nequi',
      reference: '3001234567',
      paymentMethod: { id: 2, name: 'Nequi' },
    },
  });
}

describe('BetSettlementService', () => {
  let service: BetSettlementService;
  const betsRepository = {
    findPendingByMatchForSettlement: jest.fn(),
    settlePendingByMatch: jest.fn(),
    voidPendingByMatch: jest.fn(),
  };
  const betNotifier = {
    notifySettlementBatch: jest.fn(async () => undefined),
  };
  const manager = {} as EntityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BetSettlementService(
      betsRepository as unknown as BetsRepository,
      betNotifier as unknown as BetNotifier,
    );
  });

  it('liquida apuestas en lote usando la cuota fija almacenada y notifica al aficionado', async () => {
    const pending = [
      createPendingBet(1, BetSelection.HOME_WIN, '20000.00', '2.10', 'a@uc.co'),
      createPendingBet(2, BetSelection.DRAW, '15000.00', '3.00', 'b@uc.co'),
    ];
    betsRepository.findPendingByMatchForSettlement.mockResolvedValueOnce(pending);
    betsRepository.settlePendingByMatch.mockResolvedValueOnce(2);

    const summary = await service.settleForMatch(
      {
        matchId: 10,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 2,
        awayScore: 1,
      },
      manager,
    );

    expect(betsRepository.settlePendingByMatch).toHaveBeenCalledWith(
      10,
      BetSelection.HOME_WIN,
      expect.any(Date),
      'Resultado oficial 2 - 1 (Gana local)',
      manager,
    );
    expect(summary).toEqual({
      matchId: 10,
      settledCount: 2,
      wonCount: 1,
      lostCount: 1,
      voidedCount: 0,
      totalPayout: 42000,
    });
    expect(betNotifier.notifySettlementBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        email: 'a@uc.co',
        finalStatus: BetStatus.WON,
        payout: 42000,
      }),
      expect.objectContaining({
        email: 'b@uc.co',
        finalStatus: BetStatus.LOST,
        payout: 0,
      }),
    ]);
  });

  it('no actualiza ni notifica si no hay apuestas pendientes o si ya fueron liquidadas', async () => {
    betsRepository.findPendingByMatchForSettlement.mockResolvedValueOnce([]);

    const empty = await service.settleForMatch(
      {
        matchId: 10,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 0,
        awayScore: 0,
      },
      manager,
    );

    expect(empty).toEqual({
      matchId: 10,
      settledCount: 0,
      wonCount: 0,
      lostCount: 0,
      voidedCount: 0,
      totalPayout: 0,
    });
    expect(betsRepository.settlePendingByMatch).not.toHaveBeenCalled();
    expect(betNotifier.notifySettlementBatch).not.toHaveBeenCalled();

    betsRepository.findPendingByMatchForSettlement.mockResolvedValueOnce([
      createPendingBet(1, BetSelection.DRAW, '10000.00', '2.50', 'a@uc.co'),
    ]);
    betsRepository.settlePendingByMatch.mockResolvedValueOnce(0);

    const concurrent = await service.settleForMatch(
      {
        matchId: 10,
        homeTeamId: 1,
        awayTeamId: 2,
        homeScore: 1,
        awayScore: 1,
      },
      manager,
    );
    expect(concurrent.settledCount).toBe(0);
    expect(betNotifier.notifySettlementBatch).not.toHaveBeenCalled();
  });

  it('anula apuestas pendientes devolviendo el valor apostado al cancelar el partido', async () => {
    const pending = [
      createPendingBet(1, BetSelection.AWAY_WIN, '30000.00', '2.80', 'a@uc.co'),
      createPendingBet(2, BetSelection.HOME_WIN, '10000.00', '1.90', 'b@uc.co'),
    ];
    betsRepository.findPendingByMatchForSettlement.mockResolvedValueOnce(pending);
    betsRepository.voidPendingByMatch.mockResolvedValueOnce(2);

    const summary = await service.cancelForMatch(
      10,
      'El partido fue cancelado',
      manager,
    );

    expect(betsRepository.voidPendingByMatch).toHaveBeenCalledWith(
      10,
      expect.any(Date),
      'El partido fue cancelado',
      manager,
    );
    expect(summary).toEqual({
      matchId: 10,
      settledCount: 2,
      wonCount: 0,
      lostCount: 0,
      voidedCount: 2,
      totalPayout: 40000,
    });
    expect(betNotifier.notifySettlementBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        email: 'a@uc.co',
        finalStatus: BetStatus.VOID,
        payout: 30000,
      }),
      expect.objectContaining({
        email: 'b@uc.co',
        finalStatus: BetStatus.VOID,
        payout: 10000,
      }),
    ]);
  });
});

