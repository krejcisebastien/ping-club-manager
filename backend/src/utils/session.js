import { signToken } from "./jwt.js";
import { isPlatformAdmin } from "../lib/platform.js";

// Contenu du jeton de connexion et de la session renvoyée au frontend.
// `user` doit inclure ses `players` (playerId) et son `club` (name).
export function createSession(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    playerIds: user.players.map((p) => p.playerId),
    coachId: user.coachId,
    clubId: user.clubId,
    clubName: user.club.name,
  };
  return { user: { ...payload, isPlatformAdmin: isPlatformAdmin(user.email) }, token: signToken(payload) };
}
