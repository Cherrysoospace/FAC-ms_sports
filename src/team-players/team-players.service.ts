import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamPlayer } from './entities/team-player.entity';
import { ContractStatus } from './enums/contract-status.enum';
import { TeamPlayersRepository } from './repositories/team-players.repository';
import { TeamPlayerMapper } from './mappers/team-player.mapper';
import { ContractPeriodPolicy } from './policies/contract-period.policy';
import { CreateTeamPlayerDto } from './dto/create-team-player.dto';
import { UpdateTeamPlayerDto } from './dto/update-team-player.dto';
import { ReleaseTeamPlayerDto } from './dto/release-team-player.dto';
import { TeamPlayerQueryDto } from './dto/team-player-query.dto';
import { TeamPlayerResponseDto } from './dto/team-player-response.dto';
import { TeamsService } from '../teams/teams.service';
import { PlayersService } from '../players/players.service';
import { formatDateOnly } from '../common/dates/date-only';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class TeamPlayersService {
  constructor(
    @InjectRepository(TeamPlayer)
    private readonly teamPlayerRepository: Repository<TeamPlayer>,
    private readonly teamPlayersRepository: TeamPlayersRepository,
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
  ) {}

  // ?teamId → plantilla e historial del equipo; ?playerId → equipos del jugador.
  async findAll(query: TeamPlayerQueryDto): Promise<TeamPlayerResponseDto[]> {
    const contracts = await this.teamPlayersRepository.findByFilters(query);
    return TeamPlayerMapper.toResponseDtoList(contracts);
  }

  async findOne(id: number): Promise<TeamPlayerResponseDto> {
    return TeamPlayerMapper.toResponseDto(await this.getContractOrFail(id));
  }

  async create(dto: CreateTeamPlayerDto): Promise<TeamPlayerResponseDto> {
    // Mensajes por defecto: "El equipo X está inactivo" / "El jugador Y está inactivo"
    const team = await this.teamsService.getActiveTeamOrFail(dto.teamId);
    const player = await this.playersService.getActivePlayerOrFail(
      dto.playerId,
    );
    ContractPeriodPolicy.assertValidPeriod(dto.startDate, dto.endDate);
    await this.assertNoOverlap(team.id, player.id, dto, team.name);

    const saved = await this.teamPlayerRepository.save(
      TeamPlayerMapper.toEntity(team, player, dto),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateTeamPlayerDto,
  ): Promise<TeamPlayerResponseDto> {
    const contract = await this.getContractOrFail(id);
    this.assertActive(contract);

    const period = {
      startDate: dto.startDate ?? contract.startDate,
      endDate: dto.endDate ?? contract.endDate,
    };
    ContractPeriodPolicy.assertValidPeriod(period.startDate, period.endDate);
    await this.assertNoOverlap(
      contract.team.id,
      contract.player.id,
      period,
      contract.team.name,
      id,
    );

    await this.teamPlayerRepository.save(
      TeamPlayerMapper.mergeEntity(contract, dto),
    );
    return this.findOne(id);
  }

  /**
   * Retira al jugador de la plantilla: el contrato pasa a RELEASED con fecha
   * y motivo, y se conserva como historial de traspasos. No borra la fila,
   * el jugador ni el equipo; el jugador queda libre para otro equipo.
   */
  async release(
    id: number,
    dto: ReleaseTeamPlayerDto,
  ): Promise<{ message: string; contract: TeamPlayerResponseDto }> {
    const contract = await this.getContractOrFail(id);
    this.assertActive(contract);

    const releaseDate = ContractPeriodPolicy.resolveReleaseDate(
      contract,
      dto.releaseDate,
    );
    await this.teamPlayerRepository.update(id, {
      status: ContractStatus.RELEASED,
      releaseDate,
      releaseReason: dto.reason,
    });

    return {
      message:
        `${contract.player.fullName} salió de la plantilla de ` +
        `${contract.team.name}. El contrato queda en el historial`,
      contract: await this.findOne(id),
    };
  }

  private async getContractOrFail(id: number): Promise<TeamPlayer> {
    const contract = await this.teamPlayerRepository.findOne({
      where: { id },
      relations: { team: true, player: true },
    });
    if (!contract) {
      throw ResourceNotFoundException.of('Contrato equipo-jugador', id);
    }
    return contract;
  }

  // El historial (RELEASED) no se edita ni se vuelve a retirar.
  private assertActive(contract: TeamPlayer): void {
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BusinessRuleException(
        'El contrato ya fue retirado y hace parte del historial',
      );
    }
  }

  // Misma asociación (equipo + jugador) con periodos que se cruzan → 409.
  private async assertNoOverlap(
    teamId: number,
    playerId: number,
    period: { startDate: string; endDate: string },
    teamName: string,
    excludeId?: number,
  ): Promise<void> {
    const overlapping = await this.teamPlayersRepository.findOverlapping({
      teamId,
      playerId,
      ...period,
      excludeId,
    });
    if (!overlapping) return;

    const end = ContractPeriodPolicy.effectiveEnd(overlapping);
    throw new ApplicationException(
      ErrorCase.ALREADY_EXISTS,
      overlapping.status === ContractStatus.ACTIVE
        ? `Este jugador ya se encuentra asociado a ${teamName} ` +
            `(contrato vigente hasta ${formatDateOnly(end)})`
        : `El periodo se cruza con un contrato anterior con ${teamName} ` +
            `(${formatDateOnly(overlapping.startDate)} – ${formatDateOnly(end)})`,
    );
  }
}
