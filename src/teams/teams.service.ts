import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamModality } from './enums/team-modality.enum';
import { TeamsRepository } from './repositories/teams.repository';
import { TEAM_MODALITY_LABELS, TeamMapper } from './mappers/team.mapper';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    private readonly teamsRepository: TeamsRepository,
  ) {}

  async findAll(query: TeamQueryDto): Promise<TeamResponseDto[]> {
    const teams = await this.teamsRepository.findByFilters(query);
    const ids = teams.map((t) => t.id);
    const [sports, registrations] = await Promise.all([
      this.teamsRepository.sportsByTeamIds(ids),
      this.teamsRepository.countActiveRegistrationsByTeamIds(ids),
    ]);
    const extras = new Map(
      ids.map((id) => [
        id,
        {
          sports: sports.get(id) ?? [],
          activeRegistrationsCount: registrations.get(id) ?? 0,
        },
      ]),
    );
    return TeamMapper.toResponseDtoList(teams, extras);
  }

  async findOne(id: number): Promise<TeamResponseDto> {
    const team = await this.getTeamOrFail(id);
    const [sports, activeRegistrationsCount] = await Promise.all([
      this.teamsRepository.sportsByTeamIds([id]),
      this.teamsRepository.countActiveRegistrations(id),
    ]);
    return TeamMapper.toResponseDto(team, {
      sports: sports.get(id) ?? [],
      activeRegistrationsCount,
    });
  }

  // Lo usan otros módulos (ej. Equipo-Deporte). Carga el grupo y su torneo.
  async getTeamOrFail(id: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: { group: { tournament: true } },
    });
    if (!team) throw ResourceNotFoundException.of('Equipo', id);
    return team;
  }

  async create(dto: CreateTeamDto): Promise<TeamResponseDto> {
    await this.assertNameAvailable(dto.name, dto.modality);
    const saved = await this.teamRepository.save(TeamMapper.toEntity(dto));
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.getTeamOrFail(id);

    // a) Nombre único por modalidad (con el nombre y la modalidad finales).
    const nameChanges = dto.name !== undefined && dto.name !== team.name;
    const modalityChanges =
      dto.modality !== undefined && dto.modality !== team.modality;
    if (nameChanges || modalityChanges) {
      await this.assertNameAvailable(
        dto.name ?? team.name,
        dto.modality ?? team.modality,
        id,
      );
    }

    // c) La modalidad no cambia si el equipo ya está inscrito.
    if (modalityChanges) {
      const active = await this.teamsRepository.countActiveRegistrations(id);
      if (active > 0) {
        throw new BusinessRuleException(
          `No se puede cambiar la modalidad: el equipo tiene ` +
            `${this.plural(active, 'inscripción activa', 'inscripciones activas')}`,
        );
      }
    }

    // b) No se desactiva si juega torneos que no han terminado.
    if (dto.active === false && team.active) {
      const open = await this.teamsRepository.findOpenActiveRegistrations(id);
      if (open.length > 0) {
        const names = open.map((r) => r.tournament.name);
        throw new BusinessRuleException(
          `No se puede desactivar: el equipo está inscrito en ` +
            `${names.length === 1 ? 'el torneo' : 'los torneos'} ` +
            `${this.joinList(names)}, que aún no ha${names.length === 1 ? '' : 'n'} finalizado`,
        );
      }
    }

    await this.teamRepository.save(TeamMapper.mergeEntity(team, dto));
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const team = await this.getTeamOrFail(id);

    const [sports, registrations, matches] = await Promise.all([
      this.teamsRepository.countTeamSports(id),
      this.teamsRepository.countRegistrations(id),
      this.teamsRepository.countMatches(id),
    ]);

    const dependencies = [
      this.pluralOrNull(sports, 'deporte', 'deportes'),
      this.pluralOrNull(registrations, 'inscripción', 'inscripciones'),
      this.pluralOrNull(matches, 'partido', 'partidos'),
      team.group ? `el grupo ${team.group.groupName}` : null,
    ].filter((d): d is string => d !== null);

    if (dependencies.length > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar porque tiene ${this.joinList(dependencies)} ` +
          'asociados. Desactívelo con PATCH { "active": false }',
      );
    }

    await this.teamRepository.remove(team);
    return { message: `Equipo #${id} eliminado correctamente` };
  }

  private async assertNameAvailable(
    name: string,
    modality: TeamModality,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.teamsRepository.findByNameAndModality(
      name,
      modality,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe el equipo ${name} en la modalidad ${TEAM_MODALITY_LABELS[modality]}`,
      );
    }
  }

  private plural(count: number, singular: string, pluralForm: string) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }

  private pluralOrNull(count: number, singular: string, pluralForm: string) {
    return count === 0 ? null : this.plural(count, singular, pluralForm);
  }

  private joinList(items: string[]): string {
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  }
}
