/**
 * Datos de prueba para HU-GC-08b (GET /tournaments/:id/development).
 *
 * Uso: npm run seed:development
 *
 * Crea un torneo "Copa Desarrollo (seed)" de fútbol con:
 * - Grupo A con 3 equipos (2 clasifican), 2 partidos FINISHED y 1 pendiente
 *   (IN_PROGRESS) con anotaciones.
 * - Fase final (FINAL) con 1 partido FINISHED.
 * - Inscripciones ACTIVE, jugadores con contrato vigente (para deducir el
 *   equipo de cada anotación), un escenario y una pelota por partido.
 *
 * Es idempotente: si el torneo ya existe solo imprime su id. Todo se crea en
 * una transacción, así que una ejecución fallida no deja datos a medias.
 * Al final imprime el id para la variable {{developmentTournamentId}} de Postman.
 * Está fuera de src/ y de las migraciones para que no se cargue en producción.
 */
import { EntityManager } from 'typeorm';
import dataSource from '../typeorm.config';
import { Sport } from '../src/sports/entities/sport.entity';
import { Tournament } from '../src/tournaments/entities/tournament.entity';
import { TournamentStatus } from '../src/tournaments/enums/tournament-status.enum';
import { Team } from '../src/teams/entities/team.entity';
import { TeamModality } from '../src/teams/enums/team-modality.enum';
import { Registration } from '../src/registrations/entities/registration.entity';
import { RegistrationStatus } from '../src/registrations/enums/registration-status.enum';
import { Player } from '../src/players/entities/player.entity';
import { TeamPlayer } from '../src/team-players/entities/team-player.entity';
import { Venue } from '../src/venues/entities/venue.entity';
import { Ball } from '../src/balls/entities/ball.entity';
import { GroupPhase } from '../src/phases/entities/group-phase.entity';
import { FinalPhase } from '../src/phases/entities/final-phase.entity';
import { FinalRound } from '../src/phases/enums/final-round.enum';
import { Phase } from '../src/phases/entities/phase.entity';
import { Match } from '../src/matches/entities/match.entity';
import { MatchStatus } from '../src/matches/enums/match-status.enum';
import { Goal } from '../src/goals/entities/goal.entity';

const TOURNAMENT_NAME = 'Copa Desarrollo (seed)';
const SPORT_NAME = 'Fútbol';

// Equipo y su goleador (documento único por jugador)
const TEAMS = [
  { name: 'Seed Águilas', player: 'Andrés Arango', document: 'SEEDDEV-001' },
  { name: 'Seed Búhos', player: 'Bruno Botero', document: 'SEEDDEV-002' },
  { name: 'Seed Cóndores', player: 'Camilo Cardona', document: 'SEEDDEV-003' },
];

async function getOrCreateSport(manager: EntityManager): Promise<Sport> {
  const existing = await manager
    .getRepository(Sport)
    .createQueryBuilder('sport')
    .where('LOWER(sport.name) = LOWER(:name)', { name: SPORT_NAME })
    .getOne();
  if (existing) return existing;
  return manager.getRepository(Sport).save(
    manager.getRepository(Sport).create({
      name: SPORT_NAME,
      description: 'Fútbol de once contra once',
      active: true,
    }),
  );
}

async function createMatch(
  manager: EntityManager,
  values: {
    phase: Phase;
    venue: Venue;
    home: Team;
    away: Team;
    scheduledAt: string;
    status: MatchStatus;
    homeScore?: number;
    awayScore?: number;
    ballModel: string;
  },
): Promise<Match> {
  const ball = await manager.getRepository(Ball).save(
    manager.getRepository(Ball).create({
      brand: 'Seed',
      model: values.ballModel,
      size: '5',
      active: true,
    }),
  );
  return manager.getRepository(Match).save(
    manager.getRepository(Match).create({
      phase: values.phase,
      venue: values.venue,
      homeTeam: values.home,
      awayTeam: values.away,
      ball,
      scheduledAt: new Date(values.scheduledAt),
      status: values.status,
      homeScore: values.homeScore,
      awayScore: values.awayScore,
      bettingOpen: false,
    }),
  );
}

async function seed(manager: EntityManager): Promise<number> {
  const sport = await getOrCreateSport(manager);

  const tournament = await manager.getRepository(Tournament).save(
    manager.getRepository(Tournament).create({
      name: TOURNAMENT_NAME,
      sport,
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      registrationOpensAt: new Date('2026-11-01T00:00:00'),
      registrationClosesAt: new Date('2026-11-25T23:59:59'),
      status: TournamentStatus.IN_PROGRESS,
      active: true,
    }),
  );

  const venue = await manager.getRepository(Venue).save(
    manager.getRepository(Venue).create({
      name: 'Estadio Seed Desarrollo',
      address: 'Calle 1 # 2-3',
      active: true,
    }),
  );

  const groupA = await manager.getRepository(GroupPhase).save(
    manager.getRepository(GroupPhase).create({
      tournament,
      name: 'Fase de grupos',
      order: 1,
      groupName: 'A',
      qualifiersCount: 2,
      startDate: '2026-12-01',
      endDate: '2026-12-15',
    }),
  );

  const final = await manager.getRepository(FinalPhase).save(
    manager.getRepository(FinalPhase).create({
      tournament,
      name: 'Final',
      order: 2,
      round: FinalRound.FINAL,
      startDate: '2026-12-20',
      endDate: '2026-12-31',
    }),
  );

  const teams: Team[] = [];
  const players: Player[] = [];
  for (const [index, entry] of TEAMS.entries()) {
    const team = await manager.getRepository(Team).save(
      manager.getRepository(Team).create({
        name: entry.name,
        city: 'Manizales',
        modality: TeamModality.MALE,
        active: true,
        group: groupA,
      }),
    );
    await manager.getRepository(Registration).save(
      manager.getRepository(Registration).create({
        tournament,
        team,
        status: RegistrationStatus.ACTIVE,
      }),
    );
    const player = await manager.getRepository(Player).save(
      manager.getRepository(Player).create({
        fullName: entry.player,
        documentNumber: entry.document,
        birthDate: `200${index}-05-10`,
        nationality: 'Colombiana',
        position: 'Delantero',
        heightCm: 178,
        dominantFoot: null,
        active: true,
      }),
    );
    await manager.getRepository(TeamPlayer).save(
      manager.getRepository(TeamPlayer).create({
        team,
        player,
        startDate: '2026-01-01',
        endDate: '2027-12-31',
      }),
    );
    teams.push(team);
    players.push(player);
  }
  const [aguilas, buhos, condores] = teams;
  const [andres, bruno, camilo] = players;

  // Grupo A: 2 FINISHED y 1 pendiente (en curso) con anotaciones.
  const m1 = await createMatch(manager, {
    phase: groupA,
    venue,
    home: aguilas,
    away: buhos,
    scheduledAt: '2026-12-02T15:00:00',
    status: MatchStatus.FINISHED,
    homeScore: 2,
    awayScore: 1,
    ballModel: 'Grupo A · 1',
  });
  const m2 = await createMatch(manager, {
    phase: groupA,
    venue,
    home: buhos,
    away: condores,
    scheduledAt: '2026-12-06T15:00:00',
    status: MatchStatus.FINISHED,
    homeScore: 1,
    awayScore: 1,
    ballModel: 'Grupo A · 2',
  });
  const m3 = await createMatch(manager, {
    phase: groupA,
    venue,
    home: condores,
    away: aguilas,
    scheduledAt: '2026-12-10T15:00:00',
    status: MatchStatus.IN_PROGRESS,
    ballModel: 'Grupo A · 3',
  });
  // Final: 1 partido FINISHED.
  const m4 = await createMatch(manager, {
    phase: final,
    venue,
    home: aguilas,
    away: buhos,
    scheduledAt: '2026-12-21T15:00:00',
    status: MatchStatus.FINISHED,
    homeScore: 3,
    awayScore: 0,
    ballModel: 'Final',
  });

  const goals: [Match, Player, number, string][] = [
    [m1, andres, 12, 'Cabezazo tras tiro de esquina'],
    [m1, bruno, 40, 'Remate de media distancia'],
    [m1, andres, 77, 'Penal'],
    [m2, bruno, 25, 'Contragolpe'],
    [m2, camilo, 68, 'Tiro libre'],
    [m3, camilo, 18, 'Gol en el partido en curso'],
    [m4, andres, 9, 'Primer gol de la final'],
    [m4, andres, 51, 'Doblete'],
    [m4, andres, 88, 'Triplete'],
  ];
  for (const [match, player, minute, description] of goals) {
    await manager.getRepository(Goal).save(
      manager.getRepository(Goal).create({
        match,
        player,
        minute,
        points: 1,
        description,
      }),
    );
  }

  return tournament.id;
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const existing = await dataSource
      .getRepository(Tournament)
      .findOne({ where: { name: TOURNAMENT_NAME } });
    if (existing) {
      console.log(`= ${TOURNAMENT_NAME} (ya existe)`);
      console.log(`developmentTournamentId = ${existing.id}`);
      return;
    }

    const id = await dataSource.transaction((manager) => seed(manager));
    console.log(
      `+ ${TOURNAMENT_NAME}: grupo A (3 equipos, 3 partidos) y final`,
    );
    console.log(`developmentTournamentId = ${id}`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error('No se pudo crear el torneo de desarrollo:', error);
  process.exit(1);
});
