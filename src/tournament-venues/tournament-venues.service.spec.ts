import type { Repository } from 'typeorm';
import type { TournamentVenue } from './entities/tournament-venue.entity';
import { TournamentVenuesService } from './tournament-venues.service';
import { TournamentVenuesRepository } from './repositories/tournament-venues.repository';
import { TournamentsService } from '../tournaments/tournaments.service';
import { VenuesService } from '../venues/venues.service';

/**
 * Jerarquía de prueba: Complejo (1) ⊃ Coliseo (2) ⊃ Cancha interna (3).
 * Estadio (4) es otro escenario principal.
 */
const PARENT_BY_VENUE: Record<number, number | null> = {
  1: null,
  2: 1,
  3: 2,
  4: null,
};

const ancestorsOf = (venueId: number): number[] => {
  const ancestors: number[] = [];
  let parent = PARENT_BY_VENUE[venueId] ?? null;
  while (parent !== null) {
    ancestors.push(parent);
    parent = PARENT_BY_VENUE[parent] ?? null;
  }
  return ancestors;
};

describe('TournamentVenuesService.isVenueEnabledForTournament', () => {
  const TOURNAMENT_ID = 10;
  // Escenarios habilitados para el torneo 10 en el repositorio mockeado
  let enabledVenueIds: number[];

  let service: TournamentVenuesService;
  const existsAnyVenue = jest.fn(
    async (tournamentId: number, venueIds: number[]): Promise<boolean> =>
      tournamentId === TOURNAMENT_ID &&
      venueIds.some((id) => enabledVenueIds.includes(id)),
  );
  const findAncestorIds = jest.fn(async (venueId: number) =>
    ancestorsOf(venueId),
  );

  // Se construye el servicio directamente con sus dependencias mockeadas
  // (@nestjs/testing v12 es solo ESM y jest no lo carga con esta configuración).
  beforeEach(() => {
    jest.clearAllMocks();
    enabledVenueIds = [];

    service = new TournamentVenuesService(
      {} as Repository<TournamentVenue>,
      { existsAnyVenue } as unknown as TournamentVenuesRepository,
      {} as TournamentsService,
      { findAncestorIds } as unknown as VenuesService,
    );
  });

  it('es true si el escenario está habilitado directamente', async () => {
    enabledVenueIds = [4];

    await expect(
      service.isVenueEnabledForTournament(TOURNAMENT_ID, 4),
    ).resolves.toBe(true);
    expect(existsAnyVenue).toHaveBeenCalledWith(TOURNAMENT_ID, [4]);
  });

  it('es true si un ancestro está habilitado (la cancha hereda del complejo)', async () => {
    enabledVenueIds = [1];

    await expect(
      service.isVenueEnabledForTournament(TOURNAMENT_ID, 3),
    ).resolves.toBe(true);
    expect(findAncestorIds).toHaveBeenCalledWith(3);
    expect(existsAnyVenue).toHaveBeenCalledWith(TOURNAMENT_ID, [3, 2, 1]);
  });

  it('es false si ni el escenario ni sus ancestros están habilitados', async () => {
    // Habilitar la cancha interna no habilita al complejo que la contiene
    enabledVenueIds = [3, 4];

    await expect(
      service.isVenueEnabledForTournament(TOURNAMENT_ID, 2),
    ).resolves.toBe(false);
    await expect(
      service.isVenueEnabledForTournament(TOURNAMENT_ID + 1, 4),
    ).resolves.toBe(false);
  });
});

describe('TournamentVenuesService: partidos que dependen de una asociación', () => {
  const TOURNAMENT = { id: 10, name: 'Copa', status: 'PLANNED' };
  const VENUE_NAMES: Record<number, string> = {
    1: 'Complejo',
    2: 'Coliseo',
    3: 'Cancha interna',
    4: 'Estadio',
  };

  // Partidos no CANCELLED por `${torneo}-${escenario}`
  const MATCH_COUNTS = new Map<string, number>([
    ['10-1', 1],
    ['10-2', 2],
    ['10-3', 3],
    ['10-4', 5],
    ['11-1', 7], // otro torneo: nunca cuenta
  ]);

  // Escenarios habilitados del torneo 10 en cada caso
  let enabledVenueIds: number[];
  let service: TournamentVenuesService;

  const remove = jest.fn(async () => undefined);
  const findOne = jest.fn(async ({ where }: { where: { id: number } }) => ({
    id: where.id,
    tournament: TOURNAMENT,
    venue: {
      id: where.id,
      name: VENUE_NAMES[where.id],
      address: null,
      parent: null,
    },
  }));

  // La asociación #n del mock es la del escenario n
  const scheduledFor = async (venueId: number) =>
    (await service.findOne(venueId)).scheduledMatchesCount;

  beforeEach(() => {
    jest.clearAllMocks();
    enabledVenueIds = [];

    service = new TournamentVenuesService(
      { findOne, remove } as unknown as Repository<TournamentVenue>,
      {
        countActiveMatchesByTournamentAndVenue: async () => MATCH_COUNTS,
        venueIdsByTournamentIds: async () =>
          new Map([[TOURNAMENT.id, new Set(enabledVenueIds)]]),
      } as unknown as TournamentVenuesRepository,
      {} as TournamentsService,
      {
        findAncestorIds: async (venueId: number) => ancestorsOf(venueId),
      } as unknown as VenuesService,
    );
  });

  it('cuenta los partidos del escenario y de todos sus espacios internos', async () => {
    enabledVenueIds = [1];

    await expect(scheduledFor(1)).resolves.toBe(6); // 1 + 2 + 3
    await expect(scheduledFor(4)).resolves.toBe(5);
  });

  it('no cuenta los espacios internos que tienen su propia asociación', async () => {
    enabledVenueIds = [1, 3];

    await expect(scheduledFor(1)).resolves.toBe(3); // 1 + 2, sin la cancha
    // La cancha sigue habilitada por el Complejo: retirarla no bloquea.
    await expect(scheduledFor(3)).resolves.toBe(0);
  });

  it('un escenario intermedio habilitado cubre también a sus espacios internos', async () => {
    enabledVenueIds = [1, 2];

    await expect(scheduledFor(1)).resolves.toBe(1); // solo el Complejo
    // Coliseo y cancha siguen habilitados por el Complejo (ancestro).
    await expect(scheduledFor(2)).resolves.toBe(0);
  });

  it('sin ancestro habilitado, retirar el Coliseo cuenta Coliseo y cancha', async () => {
    enabledVenueIds = [2];

    await expect(scheduledFor(2)).resolves.toBe(5); // Coliseo + cancha
  });

  it('retirar usa la misma regla: bloquea con el conteo y deja retirar si es 0', async () => {
    enabledVenueIds = [1, 2];

    await expect(service.remove(1)).rejects.toThrow(
      'No se puede retirar: hay 1 partido del torneo programados en Complejo',
    );
    expect(remove).not.toHaveBeenCalled();

    MATCH_COUNTS.set('10-1', 0);
    await expect(service.remove(1)).resolves.toEqual({
      message: 'Se retiró Complejo de los escenarios del torneo Copa',
    });
    expect(remove).toHaveBeenCalledTimes(1);
    MATCH_COUNTS.set('10-1', 1);
  });
});
