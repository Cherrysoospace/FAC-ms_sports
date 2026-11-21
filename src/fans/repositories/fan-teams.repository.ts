import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FanTeam } from '../entities/fan-team.entity';

/**
 * Consultas de equipos favoritos por aficionado (R18) sin consultas N+1.
 */
@Injectable()
export class FanTeamsRepository {
  constructor(
    @InjectRepository(FanTeam)
    private readonly fanTeamRepository: Repository<FanTeam>,
  ) {}

  findByFanId(fanId: number): Promise<FanTeam[]> {
    return this.fanTeamRepository
      .createQueryBuilder('fanTeam')
      .innerJoinAndSelect('fanTeam.team', 'team')
      .where('fanTeam.fan_id = :fanId', { fanId })
      .orderBy('team.name', 'ASC')
      .addOrderBy('fanTeam.id', 'ASC')
      .getMany();
  }

  findOneByFanAndTeam(fanId: number, teamId: number): Promise<FanTeam | null> {
    return this.fanTeamRepository
      .createQueryBuilder('fanTeam')
      .innerJoinAndSelect('fanTeam.fan', 'fan')
      .innerJoinAndSelect('fanTeam.team', 'team')
      .where('fan.id = :fanId', { fanId })
      .andWhere('team.id = :teamId', { teamId })
      .getOne();
  }

  existsByFanAndTeam(fanId: number, teamId: number): Promise<boolean> {
    return this.fanTeamRepository.exists({
      where: { fan: { id: fanId }, team: { id: teamId } },
    });
  }

  async findActiveFanEmailsByTeamIds(teamIds: number[]): Promise<string[]> {
    if (teamIds.length === 0) return [];

    const rows = await this.fanTeamRepository
      .createQueryBuilder('fanTeam')
      .innerJoin('fanTeam.fan', 'fan')
      .select('DISTINCT fan.email', 'email')
      .where('fanTeam.team_id IN (:...teamIds)', { teamIds })
      .andWhere('fan.active = :active', { active: true })
      .getRawMany<{ email: string }>();

    return Array.from(
      new Set(
        rows
          .map((row) => row.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    );
  }
}

