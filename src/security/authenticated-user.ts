import type { Request } from 'express';

/** Usuario de ms_security que hace la petición (claims del JWT ya validado). */
export interface AuthenticatedUser {
  // `sub` del JWT: id del usuario en ms_security
  id: number;
  email: string | null;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
