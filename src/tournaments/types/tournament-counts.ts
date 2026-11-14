// Conteos de un torneo que no vienen en la entidad: los calcula el
// repositorio y los recibe el mapper.
export interface TournamentCounts {
  registrationsCount: number;
  phasesCount: number;
}
