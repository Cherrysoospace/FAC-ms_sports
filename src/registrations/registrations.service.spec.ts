import type { Repository } from 'typeorm';
import { Registration } from './entities/registration.entity';
import { RegistrationStatus } from './enums/registration-status.enum';
import { Team } from '../teams/entities/team.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { TournamentStatus } from '../tournaments/enums/tournament-status.enum';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';
import { RegistrationsService } from './registrations.service';
import type { RegistrationsRepository } from './repositories/registrations.repository';
import type { TournamentsService } from '../tournaments/tournaments.service';

const DAY = 24 * 60 * 60 * 1000;

// Torneo de fútbol con el periodo de inscripción abierto hoy.
const openTournament = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  name: 'Copa Caldas',
  status: TournamentStatus.REGISTRATION_OPEN,
  registrationOpensAt: new Date(Date.now() - DAY),
  registrationClosesAt: new Date(Date.now() + DAY),
  sport: { id: 1, name: 'Fútbol' },
  ...overrides,
});

const team = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Equipo ${id}`,
  city: 'Manizales',
  modality: 'MALE',
  active: true,
  ...overrides,
});

const registration = (
  id: number,
  teamId: number,
  status = RegistrationStatus.ACTIVE,
) => ({
  id,
  status,
  registeredAt: new Date(),
  withdrawnAt: null,
  tournament: { id: 10, name: 'Copa Caldas' },
  team: team(teamId),
});

describe('RegistrationsService', () => {
  // Lo que "hay en la base" dentro de la transacción de create().
  let db: {
    teams: ReturnType<typeof team>[];
    teamSports: { team: ReturnType<typeof team> }[];
    registrations: ReturnType<typeof registration>[];
  };

  const manager = {
    find: jest.fn(async (entity: unknown) => {
      if (entity === Team) return db.teams;
      if (entity === TeamSport) return db.teamSports;
      if (entity === Registration) return db.registrations;
      return [];
    }),
    update: jest.fn(async () => undefined),
    save: jest.fn(async (rows: unknown) => rows),
  };
  const registrationRepository = {
    manager: {
      transaction: jest.fn(
        async (work: (m: typeof manager) => Promise<unknown>) => work(manager),
      ),
    },
    findOne: jest.fn(),
    update: jest.fn(async () => undefined),
  };
  const registrationsRepository = {
    findByTournamentAndTeams: jest.fn(),
    findTeamGroupInTournament: jest.fn(async () => null),
  };
  const tournamentsService = { getTournamentOrFail: jest.fn() };

  let service: RegistrationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    db = { teams: [], teamSports: [], registrations: [] };
    tournamentsService.getTournamentOrFail.mockResolvedValue(openTournament());
    registrationsRepository.findTeamGroupInTournament.mockResolvedValue(null);
    registrationsRepository.findByTournamentAndTeams.mockImplementation(
      async (_tournamentId: number, teamIds: number[]) =>
        teamIds.map((teamId, index) => registration(100 + index, teamId)),
    );
    service = new RegistrationsService(
      registrationRepository as unknown as Repository<Registration>,
      registrationsRepository as unknown as RegistrationsRepository,
      tournamentsService as unknown as TournamentsService,
    );
  });

  // Equipos 1 y 2 existen, están activos y juegan el deporte del torneo.
  const givenEligibleTeams = (...ids: number[]) => {
    db.teams = ids.map((id) => team(id));
    db.teamSports = db.teams.map((t) => ({ team: t }));
  };

  describe('create', () => {
    it('torneo inexistente: propaga el 404', async () => {
      tournamentsService.getTournamentOrFail.mockRejectedValue(
        ResourceNotFoundException.of('Torneo', 99),
      );

      await expect(
        service.create({ tournamentId: 99, teamIds: [1] }),
      ).rejects.toThrow('Torneo con id 99 no existe');
    });

    it('torneo en curso: las inscripciones están cerradas', async () => {
      tournamentsService.getTournamentOrFail.mockResolvedValue(
        openTournament({ status: TournamentStatus.IN_PROGRESS }),
      );

      await expect(
        service.create({ tournamentId: 10, teamIds: [1] }),
      ).rejects.toThrow(
        'Las inscripciones del torneo Copa Caldas están cerradas',
      );
      expect(registrationRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('inscribe varios equipos a la vez y responde cuántos', async () => {
      givenEligibleTeams(1, 2);

      const result = await service.create({
        tournamentId: 10,
        teamIds: [1, 2],
      });

      expect(manager.save).toHaveBeenCalledTimes(1);
      const saved = manager.save.mock.calls[0][0] as unknown as Registration[];
      expect(saved.map((r) => r.team.id)).toEqual([1, 2]);
      expect(saved.every((r) => r.status === RegistrationStatus.ACTIVE)).toBe(
        true,
      );
      expect(result.message).toBe(
        '2 equipos inscritos correctamente en Copa Caldas',
      );
      expect(result.registrations.map((r) => r.team.id)).toEqual([1, 2]);
    });

    it('equipo ya inscrito: 409 ALREADY_EXISTS y no guarda nada', async () => {
      givenEligibleTeams(1);
      db.registrations = [registration(5, 1)];

      const error = await service
        .create({ tournamentId: 10, teamIds: [1] })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApplicationException);
      expect((error as ApplicationException).errorCase).toBe(
        ErrorCase.ALREADY_EXISTS,
      );
      expect((error as Error).message).toBe(
        'No se pudo inscribir: Equipo 1 (ya está inscrito)',
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('lista cada equipo con su motivo: inexistente, inactivo y sin el deporte', async () => {
      db.teams = [team(2, { active: false }), team(3)];
      db.teamSports = []; // el 3 no juega fútbol

      const error = await service
        .create({ tournamentId: 10, teamIds: [1, 2, 3] })
        .catch((e: unknown) => e);

      expect((error as ApplicationException).errorCase).toBe(
        ErrorCase.INVALID_OPERATION,
      );
      expect((error as Error).message).toBe(
        'No se pudo inscribir: Equipo #1 (no existe), Equipo 2 (está inactivo), Equipo 3 (no juega Fútbol)',
      );
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('todo o nada: si un equipo falla no se inscribe ninguno', async () => {
      givenEligibleTeams(1);

      await expect(
        service.create({ tournamentId: 10, teamIds: [1, 2] }),
      ).rejects.toThrow('No se pudo inscribir: Equipo #2 (no existe)');
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('equipo retirado antes: reactiva la misma inscripción', async () => {
      givenEligibleTeams(1);
      db.registrations = [registration(5, 1, RegistrationStatus.WITHDRAWN)];

      const result = await service.create({ tournamentId: 10, teamIds: [1] });

      expect(manager.update).toHaveBeenCalledWith(
        Registration,
        expect.anything(),
        expect.objectContaining({ status: RegistrationStatus.ACTIVE }),
      );
      expect(manager.save).not.toHaveBeenCalled();
      expect(result.message).toBe(
        '1 equipo inscrito correctamente en Copa Caldas',
      );
    });
  });

  describe('withdraw', () => {
    it('inscripción inexistente: 404', async () => {
      registrationRepository.findOne.mockResolvedValue(null);

      await expect(service.withdraw(9)).rejects.toThrow(
        'Inscripción con id 9 no existe',
      );
    });

    it('ya retirada: regla de negocio', async () => {
      registrationRepository.findOne.mockResolvedValue(
        registration(5, 1, RegistrationStatus.WITHDRAWN),
      );

      await expect(service.withdraw(5)).rejects.toThrow(BusinessRuleException);
    });

    it('equipo asignado a un grupo: pide retirarlo primero del grupo', async () => {
      registrationRepository.findOne.mockResolvedValue(registration(5, 1));
      registrationsRepository.findTeamGroupInTournament.mockResolvedValue({
        groupName: 'A',
      } as never);

      await expect(service.withdraw(5)).rejects.toThrow(
        'Retire primero el equipo del grupo A',
      );
      expect(registrationRepository.update).not.toHaveBeenCalled();
    });

    it('retira sin borrar: solo cambia el estado a WITHDRAWN', async () => {
      registrationRepository.findOne.mockResolvedValue(registration(5, 1));

      const result = await service.withdraw(5);

      expect(registrationRepository.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ status: RegistrationStatus.WITHDRAWN }),
      );
      expect(result.message).toBe(
        'Se retiró la inscripción de Equipo 1 del torneo Copa Caldas',
      );
    });
  });
});
