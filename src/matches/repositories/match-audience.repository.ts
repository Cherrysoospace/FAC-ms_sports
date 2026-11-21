import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BetStatus } from '../../bets/enums/bet-status.enum';
import type {
  IMatchAudiencePort,
  MatchAudienceQuery,
} from '../../common/contracts';

interface AudienceEmailRow {
  email: string | null;
}

/**
 * Resolución única de destinatarios de correo para `MatchNotifier`
 * (boletos, apuestas activas y equipos favoritos) sin consultas N+1.
 */
@Injectable()
export class MatchAudienceRepository implements IMatchAudiencePort {
  constructor(private readonly dataSource: DataSource) {}

  async findEmailsForNewMatch(query: MatchAudienceQuery): Promise<string[]> {
    const rows = (await this.dataSource.query(
      'SELECT DISTINCT f.email AS email ' +
        'FROM fans f ' +
        'INNER JOIN tickets t ON t.fan_id = f.id ' +
        'INNER JOIN matches m ON m.id = t.match_id ' +
        'WHERE f.active = 1 AND m.id <> ? ' +
        'AND (m.home_team_id IN (?, ?) OR m.away_team_id IN (?, ?)) ' +
        'UNION ' +
        'SELECT DISTINCT f.email AS email ' +
        'FROM fans f ' +
        'INNER JOIN bets b ON b.fan_id = f.id ' +
        'INNER JOIN matches m ON m.id = b.match_id ' +
        'WHERE f.active = 1 AND m.id <> ? AND b.status <> ? ' +
        'AND (m.home_team_id IN (?, ?) OR m.away_team_id IN (?, ?)) ' +
        'UNION ' +
        'SELECT DISTINCT f.email AS email ' +
        'FROM fans f ' +
        'INNER JOIN fan_teams ft ON ft.fan_id = f.id ' +
        'WHERE f.active = 1 AND ft.team_id IN (?, ?)',
      [
        query.matchId,
        query.homeTeamId,
        query.awayTeamId,
        query.homeTeamId,
        query.awayTeamId,
        query.matchId,
        BetStatus.CANCELLED,
        query.homeTeamId,
        query.awayTeamId,
        query.homeTeamId,
        query.awayTeamId,
        query.homeTeamId,
        query.awayTeamId,
      ],
    )) as AudienceEmailRow[];

    return this.deduplicateEmails(rows);
  }

  async findEmailsForMatchUpdate(query: MatchAudienceQuery): Promise<string[]> {
    const rows = (await this.dataSource.query(
      'SELECT DISTINCT f.email AS email ' +
        'FROM fans f ' +
        'INNER JOIN tickets t ON t.fan_id = f.id ' +
        'WHERE f.active = 1 AND t.match_id = ? ' +
        'UNION ' +
        'SELECT DISTINCT f.email AS email ' +
        'FROM fans f ' +
        'INNER JOIN bets b ON b.fan_id = f.id ' +
        'WHERE f.active = 1 AND b.match_id = ? AND b.status <> ? ' +
        'UNION ' +
        'SELECT DISTINCT f.email AS email ' +
        'FROM fans f ' +
        'INNER JOIN fan_teams ft ON ft.fan_id = f.id ' +
        'WHERE f.active = 1 AND ft.team_id IN (?, ?)',
      [
        query.matchId,
        query.matchId,
        BetStatus.CANCELLED,
        query.homeTeamId,
        query.awayTeamId,
      ],
    )) as AudienceEmailRow[];

    return this.deduplicateEmails(rows);
  }

  private deduplicateEmails(rows: readonly AudienceEmailRow[]): string[] {
    const unique = new Set<string>();
    for (const row of rows) {
      const normalized = row.email?.trim().toLowerCase();
      if (normalized) {
        unique.add(normalized);
      }
    }
    return Array.from(unique);
  }
}

