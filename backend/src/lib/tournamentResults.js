// Résultats de tournoi importés de TabT : l'import enregistre « Tournoi — Série »
// dans eventName (voir toResult dans lib/tabt.js).
export function splitEventName(eventName) {
  const name = eventName ?? "";
  const at = name.lastIndexOf(" — ");
  if (at < 0) return { tournament: name || "Tournoi", serie: null };
  return { tournament: name.slice(0, at), serie: name.slice(at + 3) };
}

export const bilan = (matches) => {
  const played = matches.filter((m) => !m.walkover);
  const wins = played.filter((m) => m.won).length;
  return { played: played.length, wins, losses: played.length - wins, walkovers: matches.length - played.length };
};

const norm = (s) => (s ?? "").trim().toLocaleLowerCase("fr");
const DAY_MS = 86400000;

// Bilan d'une inscription passée : les matchs du joueur dans ce tournoi (même
// nom, dans la semaine qui suit son début) et dans cette série si TabT la donne.
// null tant que TabT n'a pas encore les résultats.
export function registrationResult(registration, results) {
  const from = registration.date.getTime();
  const inTournament = results.filter((r) => {
    const t = r.date.getTime();
    return norm(splitEventName(r.eventName).tournament) === norm(registration.name) && t >= from && t < from + 7 * DAY_MS;
  });
  const inSerie = registration.serieName ? inTournament.filter((r) => norm(splitEventName(r.eventName).serie) === norm(registration.serieName)) : [];
  const matches = inSerie.length ? inSerie : inTournament;
  return matches.length ? bilan(matches) : null;
}
