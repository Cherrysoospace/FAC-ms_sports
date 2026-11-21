import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../security/authenticated-user';
import type { Team } from '../teams/entities/team.entity';
import { TeamModality } from '../teams/enums/team-modality.enum';
import type { TeamsService } from '../teams/teams.service';
import { Fan } from './entities/fan.entity';
import { FanTeam } from './entities/fan-team.entity';
import type { FanTeamsRepository } from './repositories/fan-teams.repository';
import { FavoriteTeamMapper } from './mappers/favorite-team.mapper';
import type { FansService } from './fans.service';
import { FavoriteTeamsService } from './favorite-teams.service';

const user: AuthenticatedUser = { id: 50, email: 'fan@correo.com' };

const makeFan = () =>
  Object.assign(new Fan(), {
    id: 1,
    securityUserId: 50,
    fullName: 'Laura Martínez',
    active: true,
  });

const makeTeam = (id = 10, name = 'Millonarios') =>
  ({
    id,
    name,
    city: 'Bogotá',
    modality: TeamModality.MALE,
    active: true,
  }) as unknown as Team;

describe('FavoriteTeamsService', () => {
  let service: FavoriteTeamsService;
  const fanTeamRepository = {
    save: jest.fn(async (entity: FanTeam) => Object.assign(entity, { id: 5 })),
    remove: jest.fn(async () => undefined),
  };
  const fanTeamsRepository = {
    findByFanId: jest.fn(async () => [] as FanTeam[]),
    findOneByFanAndTeam: jest.fn(async () => null as FanTeam | null),
    existsByFanAndTeam: jest.fn(async () => false),
  };
  const fansService = {
    getFanBySecurityUserOrFail: jest.fn(async () => makeFan()),
    getActiveFanBySecurityUserOrFail: jest.fn(async () => makeFan()),
  };
  const teamsService = {
    getActiveTeamOrFail: jest.fn(async () => makeTeam()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FavoriteTeamsService(
      fanTeamRepository as unknown as Repository<FanTeam>,
      fanTeamsRepository as unknown as FanTeamsRepository,
      new FavoriteTeamMapper(),
      fansService as unknown as FansService,
      teamsService as unknown as TeamsService,
    );
  });

  it('lista los equipos favoritos del aficionado autenticado', async () => {
    const favorite = Object.assign(new FanTeam(), {
      id: 5,
      createdAt: new Date('2026-11-20T12:00:00.000Z'),
      team: makeTeam(10, 'Millonarios'),
    });
    fanTeamsRepository.findByFanId.mockResolvedValueOnce([favorite]);

    const result = await service.findBySecurityUser(user);

    expect(result).toHaveLength(1);
    expect(result[0].team).toMatchObject({ id: 10, name: 'Millonarios' });
  });

  it('agrega un equipo activo a favoritos y rechaza duplicados con 409', async () => {
    const hydrated = Object.assign(new FanTeam(), {
      id: 5,
      createdAt: new Date('2026-11-20T12:00:00.000Z'),
      fan: makeFan(),
      team: makeTeam(10, 'Millonarios'),
    });
    fanTeamsRepository.findOneByFanAndTeam.mockResolvedValueOnce(hydrated);

    const added = await service.addFavorite(user, { teamId: 10 });
    expect(added.team.name).toBe('Millonarios');

    fanTeamsRepository.existsByFanAndTeam.mockResolvedValueOnce(true);
    await expect(service.addFavorite(user, { teamId: 10 })).rejects.toThrow(
      'ya está en tus favoritos',
    );
    expect(fanTeamRepository.save).toHaveBeenCalledTimes(1);
  });

  it('elimina solo la asociación de favorito sin afectar al equipo ni al aficionado', async () => {
    const favorite = Object.assign(new FanTeam(), {
      id: 5,
      fan: makeFan(),
      team: makeTeam(10, 'Millonarios'),
    });
    fanTeamsRepository.findOneByFanAndTeam.mockResolvedValueOnce(favorite);

    await expect(service.removeFavorite(user, 10)).resolves.toEqual({
      message: 'Millonarios fue retirado de tus equipos favoritos',
    });
    expect(fanTeamRepository.remove).toHaveBeenCalledWith(favorite);
  });

  it('responde 404 al intentar retirar un equipo que no está en favoritos', async () => {
    fanTeamsRepository.findOneByFanAndTeam.mockResolvedValueOnce(null);

    await expect(service.removeFavorite(user, 99)).rejects.toThrow(
      'no está en tus favoritos',
    );
  });
});

