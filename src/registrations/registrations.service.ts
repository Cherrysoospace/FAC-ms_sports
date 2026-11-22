import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Registration } from './entities/registration.entity';
import { RegistrationStatus } from './enums/registration-status.enum';
import { Team } from '../teams/entities/team.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { TournamentsService } from '../tournaments/tournaments.service';
import { TournamentStatusPolicy } from '../tournaments/policies/tournament-status.policy';
import { RegistrationsRepository } from './repositories/registrations.repository';
import { RegistrationMapper } from './mappers/registration.mapper';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationQueryDto } from './dto/registration-query.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { CreateRegistrationsResultDto } from './dto/create-registrations-result.dto';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

// Motivo por el que no se pudo inscribir un equipo.
interface RegistrationError {
  label: string;
  duplicate: boolean;
}

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly tournamentsService: TournamentsService,
  ) {}

  async findAll(
    query: RegistrationQueryDto,
  ): Promise<RegistrationResponseDto[]> {
    const registrations =
      await this.registrationsRepository.findByFilters(query);
    return RegistrationMapper.toResponseDtoList(registrations);
  }

  async findOne(id: number): Promise<RegistrationResponseDto> {
    const registration = await this.getRegistrationOrFail(id);
    return RegistrationMapper.toResponseDto(registration);
  }

  // Lo usan otros módulos (ej. Partido).
  isTeamActivelyRegistered(
    tournamentId: number,
    teamId: number,
  ): Promise<boolean> {
    return this.registrationsRepository.existsActive(tournamentId, teamId);
  }

  async create(
    dto: CreateRegistrationDto,
  ): Promise<CreateRegistrationsResultDto> {
    const tournament = await this.tournamentsService.getTournamentOrFail(
      dto.tournamentId,
    );
    TournamentStatusPolicy.assertRegistrationOpen(tournament, new Date());

    // Todo o nada: se valida y se guarda dentro de la misma transacción.
    await this.registrationRepository.manager.transaction(async (manager) => {
      const [teams, teamSports, existing] = await Promise.all([
        manager.find(Team, { where: { id: In(dto.teamIds) } }),
        manager.find(TeamSport, {
          where: {
            team: { id: In(dto.teamIds) },
            sport: { id: tournament.sport.id },
          },
          relations: { team: true },
        }),
        manager.find(Registration, {
          where: {
            tournament: { id: tournament.id },
            team: { id: In(dto.teamIds) },
          },
          relations: { team: true },
        }),
      ]);

      const teamsById = new Map(teams.map((t) => [t.id, t]));
      const playsSport = new Set(teamSports.map((ts) => ts.team.id));
      const registrationByTeam = new Map(existing.map((r) => [r.team.id, r]));

      // Las reglas "equipo existe y está activo" son de TeamsService
      // (getActiveTeamOrFail). Aquí se evalúan sobre lo leído dentro de la
      // transacción, para todos los equipos a la vez y sin lanzar al primero:
      // el error final lista cada equipo con su motivo.
      const errors: RegistrationError[] = [];
      for (const teamId of dto.teamIds) {
        const team = teamsById.get(teamId);
        const previous = registrationByTeam.get(teamId);
        if (!team) {
          errors.push({
            label: `Equipo #${teamId} (no existe)`,
            duplicate: false,
          });
        } else if (!team.active) {
          errors.push({
            label: `${team.name} (está inactivo)`,
            duplicate: false,
          });
        } else if (!playsSport.has(teamId)) {
          errors.push({
            label: `${team.name} (no juega ${tournament.sport.name})`,
            duplicate: false,
          });
        } else if (previous?.status === RegistrationStatus.ACTIVE) {
          errors.push({
            label: `${team.name} (ya está inscrito)`,
            duplicate: true,
          });
        }
      }

      if (errors.length > 0) {
        throw new ApplicationException(
          errors.every((e) => e.duplicate)
            ? ErrorCase.ALREADY_EXISTS
            : ErrorCase.INVALID_OPERATION,
          `No se pudo inscribir: ${errors.map((e) => e.label).join(', ')}`,
        );
      }

      const now = new Date();
      const newRegistrations: Registration[] = [];
      // Retiradas antes: la restricción única obliga a reactivar la fila.
      const reactivatedIds: number[] = [];
      for (const teamId of dto.teamIds) {
        const previous = registrationByTeam.get(teamId);
        if (previous) {
          reactivatedIds.push(previous.id);
        } else {
          const team = teamsById.get(teamId);
          if (team) {
            newRegistrations.push(
              RegistrationMapper.toEntity(tournament, team),
            );
          }
        }
      }
      // Un solo UPDATE ... WHERE id IN (...) para todas las reactivaciones.
      if (reactivatedIds.length > 0) {
        await manager.update(
          Registration,
          { id: In(reactivatedIds) },
          {
            status: RegistrationStatus.ACTIVE,
            withdrawnAt: () => 'NULL',
            registeredAt: now,
          },
        );
      }
      if (newRegistrations.length > 0) await manager.save(newRegistrations);
    });

    const saved = await this.registrationsRepository.findByTournamentAndTeams(
      tournament.id,
      dto.teamIds,
    );
    // Se responde en el mismo orden en que llegaron los equipos.
    const order = new Map(dto.teamIds.map((teamId, index) => [teamId, index]));
    saved.sort(
      (a, b) => (order.get(a.team.id) ?? 0) - (order.get(b.team.id) ?? 0),
    );

    const count = saved.length;
    return {
      message:
        `${count} ${count === 1 ? 'equipo inscrito' : 'equipos inscritos'} ` +
        `correctamente en ${tournament.name}`,
      registrations: RegistrationMapper.toResponseDtoList(saved),
    };
  }

  async withdraw(
    id: number,
  ): Promise<{ message: string; registration: RegistrationResponseDto }> {
    const registration = await this.getRegistrationOrFail(id);
    if (registration.status !== RegistrationStatus.ACTIVE) {
      throw new BusinessRuleException('La inscripción ya está retirada');
    }

    const tournament = await this.tournamentsService.getTournamentOrFail(
      registration.tournament.id,
    );
    TournamentStatusPolicy.assertRegistrationOpen(tournament, new Date());

    const group = await this.registrationsRepository.findTeamGroupInTournament(
      registration.team.id,
      tournament.id,
    );
    if (group) {
      throw new BusinessRuleException(
        `Retire primero el equipo del grupo ${group.groupName}`,
      );
    }

    // Solo cambia el estado: no se borra la fila, el equipo ni el torneo.
    await this.registrationRepository.update(id, {
      status: RegistrationStatus.WITHDRAWN,
      withdrawnAt: new Date(),
    });

    return {
      message:
        `Se retiró la inscripción de ${registration.team.name} del torneo ` +
        tournament.name,
      registration: await this.findOne(id),
    };
  }

  private async getRegistrationOrFail(id: number): Promise<Registration> {
    const registration = await this.registrationRepository.findOne({
      where: { id },
      relations: { tournament: true, team: true },
    });
    if (!registration) throw ResourceNotFoundException.of('Inscripción', id);
    return registration;
  }
}
