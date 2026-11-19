import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../entities/player.entity';
import { TeamPlayer } from '../../team-players/entities/team-player.entity';
import { ContractStage } from '../../team-players/enums/contract-stage.enum';
import { contractStageCondition } from '../../team-players/repositories/contract-stage.sql';
import { PlayerSkill } from '../../player-skills/entities/player-skill.entity';
import { PlayerQueryDto } from '../dto/player-query.dto';
import { PlayerTeamSummaryDto } from '../dto/player-response.dto';
import { escapeLike } from '../../common/database/query.util';

interface CurrentTeamRow {
  playerId: number | string;
  teamId: number | string;
  teamName: string;
}

// Consultas propias del módulo de jugadores.
@Injectable()
export class PlayersRepository {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(TeamPlayer)
    private readonly teamPlayerRepository: Repository<TeamPlayer>,
    @InjectRepository(PlayerSkill)
    private readonly playerSkillRepository: Repository<PlayerSkill>,
  ) {}

  findByFilters(query: PlayerQueryDto): Promise<Player[]> {
    const qb = this.playerRepository
      .createQueryBuilder('player')
      .orderBy('player.fullName', 'ASC');

    if (query.search) {
      // El documento se guarda sin puntos: '1.053' también encuentra '1053...'.
      qb.andWhere(
        '(LOWER(player.fullName) LIKE LOWER(:search) OR player.documentNumber LIKE :document)',
        {
          search: `%${escapeLike(query.search)}%`,
          document: `%${escapeLike(query.search.replace(/[.\s]/g, '').toUpperCase())}%`,
        },
      );
    }
    if (query.active !== undefined) {
      qb.andWhere('player.active = :active', { active: query.active });
    }
    // Jugadores con contrato vigente hoy en ese equipo
    if (query.teamId !== undefined) {
      const current = contractStageCondition(
        'tp',
        ContractStage.CURRENT,
        'teamFilter',
      );
      qb.andWhere(
        'EXISTS (SELECT 1 FROM team_players tp WHERE tp.player_id = player.id ' +
          `AND tp.team_id = :teamId AND ${current.sql})`,
        { teamId: query.teamId, ...current.params },
      );
    }
    // Jugadores con contrato vigente hoy en un equipo que juega ese deporte
    if (query.sportId !== undefined) {
      const current = contractStageCondition(
        'tp',
        ContractStage.CURRENT,
        'sportFilter',
      );
      qb.andWhere(
        'EXISTS (SELECT 1 FROM team_players tp ' +
          'INNER JOIN team_sports ts ON ts.team_id = tp.team_id ' +
          `WHERE tp.player_id = player.id AND ts.sport_id = :sportId AND ${current.sql})`,
        { sportId: query.sportId, ...current.params },
      );
    }

    return qb.getMany();
  }

  findByDocumentNumber(
    documentNumber: string,
    excludeId?: number,
  ): Promise<Player | null> {
    const qb = this.playerRepository
      .createQueryBuilder('player')
      .where('player.documentNumber = :documentNumber', { documentNumber });

    if (excludeId !== undefined) {
      qb.andWhere('player.id <> :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  // Equipos con contrato vigente hoy de varios jugadores en una sola consulta.
  async currentTeamsByPlayerIds(
    ids: number[],
  ): Promise<Map<number, PlayerTeamSummaryDto[]>> {
    const teams = new Map<number, PlayerTeamSummaryDto[]>();
    if (ids.length === 0) return teams;

    const current = contractStageCondition('teamPlayer', ContractStage.CURRENT);
    const rows = await this.teamPlayerRepository
      .createQueryBuilder('teamPlayer')
      .innerJoin('teamPlayer.team', 'team')
      .select('teamPlayer.player_id', 'playerId')
      .addSelect('team.id', 'teamId')
      .addSelect('team.name', 'teamName')
      .where('teamPlayer.player_id IN (:...ids)', { ids })
      .andWhere(current.sql, current.params)
      .orderBy('team.name', 'ASC')
      .getRawMany<CurrentTeamRow>();

    for (const row of rows) {
      const playerId = Number(row.playerId);
      const list = teams.get(playerId) ?? [];
      list.push({ id: Number(row.teamId), name: row.teamName });
      teams.set(playerId, list);
    }
    return teams;
  }

  // Todos los contratos (también el historial): bloquean la eliminación.
  countContracts(playerId: number): Promise<number> {
    return this.teamPlayerRepository.count({
      where: { player: { id: playerId } },
    });
  }

  countSkills(playerId: number): Promise<number> {
    return this.playerSkillRepository.count({
      where: { player: { id: playerId } },
    });
  }
}
