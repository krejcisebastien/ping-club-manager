// Affichage des noms de personnes (joueurs, entraineurs, sparrings) : "Nom Prénom"
// partout dans l'application, pour un tri et une lecture cohérents.
export function fullName(p) {
  return `${p?.lastName ?? ""} ${p?.firstName ?? ""}`.trim();
}

export function initials(p) {
  return `${p?.lastName?.[0] ?? ""}${p?.firstName?.[0] ?? ""}`.toUpperCase();
}
