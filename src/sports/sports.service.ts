import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from './entities/sport.entity';
import { SportsRepository } from './repositories/sports.repository';
import { SportMapper } from './mappers/sport.mapper';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { SportQueryDto } from './dto/sport-query.dto';
import { SportResponseDto } from './dto/sport-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
    private readonly sportsRepository: SportsRepository,
  ) {}

  async findAll(query: SportQueryDto): Promise<SportResponseDto[]> {
    if (query.roots === true && query.parentId !== undefined) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'Use roots o parentId, no ambos',
      );
    }
    const sports = await this.sportsRepository.findByFilters(query);
    return SportMapper.toResponseDtoList(sports);
  }

  async findOne(id: number): Promise<SportResponseDto> {
    const sport = await this.sportRepository.findOne({
      where: { id },
      relations: { parent: true, subSports: true },
      order: { subSports: { name: 'ASC' } },
    });
    if (!sport) throw ResourceNotFoundException.of('Deporte', id);
    return SportMapper.toResponseDto(sport);
  }

  async create(dto: CreateSportDto): Promise<SportResponseDto> {
    await this.assertNameAvailable(dto.name);

    const parent =
      dto.parentId != null ? await this.getActiveParent(dto.parentId) : null;

    const saved = await this.sportRepository.save(
      SportMapper.toEntity(dto, parent),
    );
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateSportDto): Promise<SportResponseDto> {
    const sport = await this.getSportOrFail(id);

    if (dto.name !== undefined && dto.name !== sport.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    // getSportOrFail carga la relación parent, así se puede comparar.
    const currentParentId = sport.parent?.id ?? null;
    let changes: UpdateSportDto = dto;
    let parent: Sport | null = null;

    if (typeof dto.parentId === 'number' && dto.parentId === currentParentId) {
      // Mismo padre: no se valida ni se reasigna.
      changes = Object.assign(new UpdateSportDto(), dto, {
        parentId: undefined,
      });
    } else if (typeof dto.parentId === 'number') {
      const newParentId = dto.parentId;
      const ancestors = await this.sportsRepository.findAncestorIds(newParentId);
      if (newParentId === id || ancestors.includes(id)) {
        throw new ApplicationException(
          ErrorCase.INVALID_OPERATION,
          'Un deporte no puede ser subdeporte de sí mismo ni de sus subdeportes',
        );
      }
      parent = await this.getActiveParent(newParentId);
    }

    await this.sportRepository.save(
      SportMapper.mergeEntity(sport, changes, parent),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const sport = await this.getSportOrFail(id);

    const [subSports, tournaments, teams] = await Promise.all([
      this.sportsRepository.countSubSports(id),
      this.sportsRepository.countTournaments(id),
      this.sportsRepository.countTeamSports(id),
    ]);

    const dependencies = [
      this.plural(subSports, 'subdeporte', 'subdeportes'),
      this.plural(tournaments, 'torneo', 'torneos'),
      this.plural(teams, 'equipo', 'equipos'),
    ].filter((d): d is string => d !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar porque tiene ${this.joinList(dependencies)} ` +
          'asociados. Desactívelo con PATCH { "active": false }',
      );
    }

    await this.sportRepository.remove(sport);
    return { message: `Deporte #${id} eliminado correctamente` };
  }

  private async getSportOrFail(id: number): Promise<Sport> {
    const sport = await this.sportRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!sport) throw ResourceNotFoundException.of('Deporte', id);
    return sport;
  }

  private async getActiveParent(parentId: number): Promise<Sport> {
    const parent = await this.sportRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) throw ResourceNotFoundException.of('Deporte', parentId);
    if (!parent.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El deporte padre está inactivo',
      );
    }
    return parent;
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.sportsRepository.findByNameIgnoringCase(
      name,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un deporte con el nombre "${name}"`,
      );
    }
  }

  private plural(count: number, singular: string, pluralForm: string) {
    if (count === 0) return null;
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }

  private joinList(items: string[]): string {
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  }
}
