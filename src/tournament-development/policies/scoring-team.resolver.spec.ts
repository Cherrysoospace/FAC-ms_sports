import { ScoringTeamResolver } from './scoring-team.resolver';

const HOME = { id: 1, name: 'Águilas' };
const AWAY = { id: 2, name: 'Búhos' };
const OTHER = { id: 3, name: 'Cóndores' };
const MATCH = {
  scheduledAt: new Date(2026, 11, 10, 15, 0),
  homeTeam: HOME,
  awayTeam: AWAY,
};

const contract = (
  team: typeof HOME,
  startDate: string,
  endDate: string,
  releaseDate: string | null = null,
) => ({ team, startDate, endDate, releaseDate });

describe('ScoringTeamResolver.resolve', () => {
  it('elige el equipo con contrato vigente el día del partido', () => {
    expect(
      ScoringTeamResolver.resolve(MATCH, [
        contract(HOME, '2025-01-01', '2026-06-30'),
        contract(AWAY, '2026-07-01', '2027-06-30'),
      ]),
    ).toEqual(AWAY);
  });

  it('un contrato retirado antes del partido no cuenta como vigente', () => {
    expect(
      ScoringTeamResolver.resolve(MATCH, [
        contract(HOME, '2026-01-01', '2027-01-01', '2026-11-01'),
        contract(AWAY, '2025-01-01', '2025-12-31'),
      ]),
    ).toBeNull();
  });

  it('sin contrato vigente usa el único equipo participante con contrato', () => {
    expect(
      ScoringTeamResolver.resolve(MATCH, [
        contract(HOME, '2020-01-01', '2020-12-31'),
        contract(OTHER, '2026-01-01', '2027-01-01'),
      ]),
    ).toEqual(HOME);
  });

  it('sin contratos con los equipos del partido devuelve null', () => {
    expect(
      ScoringTeamResolver.resolve(MATCH, [
        contract(OTHER, '2026-01-01', '2027-01-01'),
      ]),
    ).toBeNull();
  });
});
