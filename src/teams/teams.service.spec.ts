import type { Repository } from 'typeorm';
import { BusinessRuleException } from '../common/exceptions';
import type { Team } from './entities/team.entity';
import type { TeamsRepository } from './repositories/teams.repository';
import { TeamsService } from './teams.service';

const makeTeam = () =>
  ({ id: 7, name: 'Once Caldas', group: null }) as unknown as Team;

describe('TeamsService.remove', () => {
  let service: TeamsService;
  const teamRepository = {
    findOne: jest.fn(async () => makeTeam()),
    remove: jest.fn(async () => undefined),
  };
  const teamsRepository = {
    countTeamSports: jest.fn(async () => 0),
    countRegistrations: jest.fn(async () => 0),
    countMatches: jest.fn(async () => 0),
    countTeamPlayers: jest.fn(async () => 0),
    countRelatedTeams: jest.fn(async () => 0),
    countFanTeams: jest.fn(async () => 0),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeamsService(
      teamRepository as unknown as Repository<Team>,
      teamsRepository as unknown as TeamsRepository,
    );
  });

  it('elimina el equipo cuando no tiene dependencias', async () => {
    await expect(service.remove(7)).resolves.toEqual({
      message: 'Equipo #7 eliminado correctamente',
    });
    expect(teamRepository.remove).toHaveBeenCalled();
  });

  it('responde 409 con mensaje claro si hay aficionados que lo siguen', async () => {
    teamsRepository.countFanTeams.mockResolvedValueOnce(2);

    const error = await service.remove(7).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BusinessRuleException);
    expect((error as Error).message).toContain('2 aficionados que lo siguen');
    expect(teamRepository.remove).not.toHaveBeenCalled();
  });
});
