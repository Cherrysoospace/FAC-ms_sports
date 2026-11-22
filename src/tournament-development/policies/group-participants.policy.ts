export interface GroupParticipant {
  id: number;
  name: string;
}

export interface GroupParticipantMatch {
  homeTeam: GroupParticipant;
  awayTeam: GroupParticipant;
}

/**
 * Participantes de UN grupo (HU-GC-08b criterios 4 y 5).
 * Unión sin repetidos de (a) los equipos con group_id = ese grupo y
 * (b) los locales y visitantes de los partidos del grupo.
 *
 * Por el diagrama (Grupo 1 — n Equipo) un equipo solo guarda su grupo actual;
 * si se reasigna a un grupo de otro torneo, (b) lo conserva en la tabla del
 * torneo anterior. Ordenados por nombre e id.
 */
export class GroupParticipantsPolicy {
  static resolve(
    groupTeams: readonly GroupParticipant[],
    groupMatches: readonly GroupParticipantMatch[],
  ): GroupParticipant[] {
    const participants = new Map<number, GroupParticipant>();
    const add = (team: GroupParticipant) => {
      if (!participants.has(team.id)) {
        participants.set(team.id, { id: team.id, name: team.name });
      }
    };

    groupTeams.forEach(add);
    for (const match of groupMatches) {
      add(match.homeTeam);
      add(match.awayTeam);
    }

    return [...participants.values()].sort(
      (a, b) => a.name.localeCompare(b.name, 'es') || a.id - b.id,
    );
  }
}
