import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { PlayersRepository } from './repositories/players.repository';
import { PlayerMapper } from './mappers/player.mapper';
import { PlayerAgePolicy } from './policies/player-age.policy';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerQueryDto } from './dto/player-query.dto';
import { PlayerResponseDto } from './dto/player-response.dto';
import { joinList, plural } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly playersRepository: PlayersRepository,
  ) {}

  async findAll(query: PlayerQueryDto): Promise<PlayerResponseDto[]> {
    const players = await this.playersRepository.findByFilters(query);
    const currentTeams = await this.playersRepository.currentTeamsByPlayerIds(
      players.map((p) => p.id),
    );
    return PlayerMapper.toResponseDtoList(players, currentTeams);
  }

  async findOne(id: number): Promise<PlayerResponseDto> {
    const player = await this.getPlayerOrFail(id);
    const currentTeams = await this.playersRepository.currentTeamsByPlayerIds([
      id,
    ]);
    return PlayerMapper.toResponseDto(player, {
      currentTeams: currentTeams.get(id) ?? [],
    });
  }

  // Lo usan otros módulos (Equipo-Jugador, Habilidad-Jugador, Anotación).
  async getPlayerOrFail(id: number): Promise<Player> {
    const player = await this.playerRepository.findOne({ where: { id } });
    if (!player) throw ResourceNotFoundException.of('Jugador', id);
    return player;
  }

  /**
   * Regla "el jugador debe existir (404) y estar activo (INVALID_OPERATION)",
   * con el mismo mensaje para todos los módulos que asignan jugadores.
   */
  async getActivePlayerOrFail(id: number): Promise<Player> {
    const player = await this.getPlayerOrFail(id);
    if (!player.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El jugador ${player.fullName} está inactivo`,
      );
    }
    return player;
  }

  async create(dto: CreatePlayerDto): Promise<PlayerResponseDto> {
    PlayerAgePolicy.assertValidBirthDate(dto.birthDate);
    await this.assertDocumentAvailable(dto.documentNumber);
    const saved = await this.playerRepository.save(PlayerMapper.toEntity(dto));
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdatePlayerDto): Promise<PlayerResponseDto> {
    const player = await this.getPlayerOrFail(id);

    if (dto.birthDate !== undefined && dto.birthDate !== player.birthDate) {
      PlayerAgePolicy.assertValidBirthDate(dto.birthDate);
    }
    if (
      dto.documentNumber !== undefined &&
      dto.documentNumber !== player.documentNumber
    ) {
      await this.assertDocumentAvailable(dto.documentNumber, id);
    }

    await this.playerRepository.save(PlayerMapper.mergeEntity(player, dto));
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const player = await this.getPlayerOrFail(id);

    const [contracts, skills] = await Promise.all([
      this.playersRepository.countContracts(id),
      this.playersRepository.countSkills(id),
    ]);

    const dependencies = [
      plural(contracts, 'contrato con equipos', 'contratos con equipos'),
      plural(skills, 'habilidad', 'habilidades'),
    ].filter((d): d is string => d !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar el jugador porque tiene ${joinList(dependencies)} ` +
          'asociados. Desactívelo con PATCH { "active": false }',
      );
    }

    await this.playerRepository.remove(player);
    return { message: `Jugador #${id} eliminado correctamente` };
  }

  private async assertDocumentAvailable(
    documentNumber: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.playersRepository.findByDocumentNumber(
      documentNumber,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un jugador registrado con el documento ${documentNumber} ` +
          `(${existing.fullName})`,
      );
    }
  }
}
