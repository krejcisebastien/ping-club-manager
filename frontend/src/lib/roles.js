const ROLE_HOME = { ADMIN: "/admin", COACH: "/coach", PLAYER: "/player" };
const ROLE_PRIORITY = ["ADMIN", "COACH", "PLAYER"];
export const ROLE_LABELS = { ADMIN: "Administrateur", COACH: "Entraineur", PLAYER: "Joueur" };

export function defaultRole(roles) {
  return ROLE_PRIORITY.find((r) => roles?.includes(r)) ?? null;
}

export function roleHome(role) {
  return ROLE_HOME[role] ?? "/login";
}
