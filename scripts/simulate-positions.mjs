#!/usr/bin/env node
/**
 * Simulador de posiciones para la pizarra (HU-GC-09).
 *
 * Inicia sesión en ms_security con un usuario de servicio (rol "SIMULADOR DE
 * POSICIONES"), lee el partido y la plantilla vigente de los dos equipos, y
 * cada INTERVAL_MS envía a POST /match-positions una "foto" del campo con
 * todos los jugadores y la pelota. Se detiene con Ctrl+C o cuando el partido
 * deja de estar en curso.
 *
 * Uso:   npm run simulate:positions -- <matchId> [intervaloMs]
 * Ej.:   npm run simulate:positions -- 3 1500
 *
 * Variables (en .env o en el entorno):
 *   MS_SECURITY          http://localhost:8181
 *   SPORTS_API_URL       http://localhost:3001/gestion-deportiva
 *   SIMULATOR_EMAIL      correo del usuario de servicio
 *   SIMULATOR_PASSWORD   su contraseña
 */
import { readFileSync, existsSync } from 'node:fs';

// ---- Configuración ----

// Lee .env sin dependencias (las variables del entorno tienen prioridad)
function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined)
      process.env[match[1]] = match[2];
  }
}

loadDotEnv();

const matchId = Number(process.argv[2]);
const intervalMs = Number(process.argv[3] ?? 1500);
const SECURITY_URL = (
  process.env.MS_SECURITY ?? 'http://localhost:8181'
).replace(/\/$/, '');
const SPORTS_URL = (
  process.env.SPORTS_API_URL ??
  `http://localhost:${process.env.PORT ?? 3001}/gestion-deportiva`
).replace(/\/$/, '');
const EMAIL = process.env.SIMULATOR_EMAIL;
const PASSWORD = process.env.SIMULATOR_PASSWORD;

if (!Number.isInteger(matchId) || matchId < 1)
  fail(
    'Indica el id del partido: npm run simulate:positions -- <matchId> [intervaloMs]',
  );
if (!Number.isInteger(intervalMs) || intervalMs < 500)
  fail('El intervalo debe ser un entero de al menos 500 ms');
if (!EMAIL || !PASSWORD)
  fail(
    'Define SIMULATOR_EMAIL y SIMULATOR_PASSWORD (usuario con el rol "SIMULADOR DE POSICIONES")',
  );

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

// ---- Cliente HTTP ----

let token = null;

async function login() {
  const response = await fetch(`${SECURITY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.accessToken)
    fail(
      `No se pudo iniciar sesión en ms_security (${response.status}): ${body.message ?? 'sin detalle'}`,
    );
  if (body.twoFactorRequired)
    fail('El usuario de servicio tiene 2FA activo: usa uno sin doble factor');
  token = body.accessToken;
}

// Petición a ms-sports; si el token venció (401), inicia sesión y reintenta una vez
async function sports(method, path, payload, retried = false) {
  const response = await fetch(`${SPORTS_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (response.status === 401 && !retried) {
    await login();
    return sports(method, path, payload, true);
  }
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

// ---- Movimiento ----

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 100) / 100;
const jitter = (amount) => (Math.random() - 0.5) * 2 * amount;

// Formación inicial: el local ataca hacia x = 100 desde su mitad (x < 50)
function formation(players, side) {
  return players.map((player, index) => {
    const column = Math.floor(index / 4);
    const row = index % 4;
    const x = side === 'HOME' ? 10 + column * 12 : 90 - column * 12;
    return { playerId: player.id, x: clamp(x, 3, 97), y: 15 + row * 23, side };
  });
}

// Cada jugador se mueve un poco y tiende a volver a su zona
function step(state) {
  for (const point of state) {
    const home = point.side === 'HOME' ? 30 : 70;
    point.x = clamp(point.x + jitter(4) + (home - point.x) * 0.03, 1, 99);
    point.y = clamp(point.y + jitter(4), 1, 99);
  }
}

// ---- Programa ----

async function main() {
  await login();

  const match = await sports('GET', `/matches/${matchId}`);
  if (match.status !== 200)
    fail(
      `No se pudo leer el partido #${matchId} (${match.status}): ${match.body.message ?? ''}`,
    );
  const { homeTeam, awayTeam, status } = match.body;
  if (status !== 'IN_PROGRESS')
    fail(
      `El partido #${matchId} está ${status}: inícialo (PATCH { "status": "IN_PROGRESS" }) antes de simular`,
    );

  const roster = async (teamId) => {
    const result = await sports(
      'GET',
      `/team-players?teamId=${teamId}&stage=CURRENT`,
    );
    if (result.status !== 200)
      fail(
        `No se pudo leer la plantilla del equipo #${teamId} (${result.status})`,
      );
    return result.body.map((contract) => contract.player);
  };
  const [homePlayers, awayPlayers] = await Promise.all([
    roster(homeTeam.id),
    roster(awayTeam.id),
  ]);
  if (homePlayers.length + awayPlayers.length === 0)
    fail('Ninguno de los dos equipos tiene jugadores con contrato vigente');

  const players = [
    ...formation(homePlayers, 'HOME'),
    ...formation(awayPlayers, 'AWAY'),
  ];
  const ball = { x: 50, y: 50 };
  let carrier = players[Math.floor(Math.random() * players.length)];
  let ticks = 0;

  console.log(
    `▶ Simulando ${homeTeam.name} (${homePlayers.length}) vs ${awayTeam.name} (${awayPlayers.length}) cada ${intervalMs} ms. Ctrl+C para detener.`,
  );

  const timer = setInterval(async () => {
    step(players);
    // La pelota sigue a su poseedor y de vez en cuando cambia de dueño (un pase)
    if (Math.random() < 0.25)
      carrier = players[Math.floor(Math.random() * players.length)];
    ball.x = clamp(carrier.x + jitter(2), 0, 100);
    ball.y = clamp(carrier.y + jitter(2), 0, 100);

    const positions = [
      ...players.map((point) => ({
        playerId: point.playerId,
        x: round(point.x),
        y: round(point.y),
      })),
      { ball: true, x: round(ball.x), y: round(ball.y) },
    ];
    const result = await sports('POST', '/match-positions', {
      matchId,
      positions,
    });
    ticks += 1;

    if (result.status === 201) {
      process.stdout.write(
        `\r  ${ticks} envíos · ${result.body.recorded} posiciones · pelota (${round(ball.x)}, ${round(ball.y)})   `,
      );
    } else {
      clearInterval(timer);
      console.log(
        `\n■ Se detuvo la simulación (${result.status}): ${result.body.message ?? JSON.stringify(result.body)}`,
      );
      process.exit(result.status === 400 ? 0 : 1);
    }
  }, intervalMs);

  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log(`\n■ Simulación detenida: ${ticks} envíos.`);
    process.exit(0);
  });
}

main().catch((error) =>
  fail(error instanceof Error ? error.message : String(error)),
);
