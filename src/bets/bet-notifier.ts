import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { Bet } from './entities/bet.entity';
import { BetSelection } from './enums/bet-selection.enum';
import { BetStatus } from './enums/bet-status.enum';
import {
  BET_SELECTION_LABELS,
  BET_STATUS_LABELS,
  BetRulesPolicy,
} from './policies/bet-rules.policy';

export interface BetSettlementNotificationItem {
  email: string;
  matchLabel: string;
  selection: BetSelection;
  amount: number;
  odds: number;
  finalStatus: BetStatus;
  payout: number;
  note: string;
}

/**
 * HU-GC-11: notificaciones por correo al registrar, cancelar o liquidar apuestas.
 * Responsabilidad única de mensajería desacoplada de la persistencia.
 */
@Injectable()
export class BetNotifier {
  constructor(private readonly notificationsService: NotificationsService) {}

  async notifyBetPlaced(bet: Bet): Promise<void> {
    const amount = Number(bet.amount);
    const odds = Number(bet.odds);
    const potentialPayout = BetRulesPolicy.calculatePotentialPayout(
      amount,
      odds,
    );
    const matchLabel = `${bet.match.homeTeam.name} vs ${bet.match.awayTeam.name}`;

    await this.notificationsService.notify({
      to: [bet.fan.email],
      subject: `Apuesta registrada: ${matchLabel}`,
      body:
        `Tu apuesta fue registrada correctamente.\n\n` +
        `Partido: ${matchLabel}\n` +
        `Selección: ${BET_SELECTION_LABELS[bet.selection]}\n` +
        `Valor apostado: ${amount.toFixed(2)}\n` +
        `Cuota fija: ${odds.toFixed(2)}\n` +
        `Pago potencial: ${potentialPayout.toFixed(2)}\n` +
        `Método de pago: ${bet.fanPaymentMethod.alias} (${bet.fanPaymentMethod.reference})`,
    });
  }

  async notifyBetSettled(bet: Bet): Promise<void> {
    const matchLabel = `${bet.match.homeTeam.name} vs ${bet.match.awayTeam.name}`;
    const amount = Number(bet.amount);
    const odds = Number(bet.odds);
    const payout = Number(bet.payout ?? 0);
    const statusLabel = BET_STATUS_LABELS[bet.status];
    const detail = bet.settlementNote ? `\nDetalle: ${bet.settlementNote}` : '';

    await this.notificationsService.notify({
      to: [bet.fan.email],
      subject: `Apuesta ${statusLabel}: ${matchLabel}`,
      body:
        `Tu apuesta quedó en estado ${statusLabel}.\n\n` +
        `Partido: ${matchLabel}\n` +
        `Selección: ${BET_SELECTION_LABELS[bet.selection]}\n` +
        `Valor apostado: ${amount.toFixed(2)}\n` +
        `Cuota fija: ${odds.toFixed(2)}\n` +
        `Valor pagado o devuelto: ${payout.toFixed(2)}${detail}`,
    });
  }

  async notifySettlementBatch(
    items: readonly BetSettlementNotificationItem[],
  ): Promise<void> {
    if (items.length === 0) return;

    await Promise.all(
      items.map((item) => {
        const statusLabel = BET_STATUS_LABELS[item.finalStatus];
        return this.notificationsService.notify({
          to: [item.email],
          subject: `Apuesta ${statusLabel}: ${item.matchLabel}`,
          body:
            `Tu apuesta fue liquidada con estado ${statusLabel}.\n\n` +
            `Partido: ${item.matchLabel}\n` +
            `Selección: ${BET_SELECTION_LABELS[item.selection]}\n` +
            `Valor apostado: ${item.amount.toFixed(2)}\n` +
            `Cuota fija: ${item.odds.toFixed(2)}\n` +
            `Valor pagado o devuelto: ${item.payout.toFixed(2)}\n` +
            `Detalle: ${item.note}`,
        });
      }),
    );
  }
}
