// Inscriptions aux tournois à venir (importées de TabT) regroupées par
// tournoi : un tournoi peut compter plusieurs séries et plusieurs joueurs.
export function groupByTournament(registrations) {
  const groups = new Map();
  for (const r of registrations) {
    if (!groups.has(r.tournamentId)) {
      groups.set(r.tournamentId, { id: r.tournamentId, name: r.name, date: r.date, venue: r.venue, town: r.town, entries: [] });
    }
    groups.get(r.tournamentId).entries.push(r);
  }
  return [...groups.values()];
}

// TabT renvoie le tournoi à minuit UTC : on lit la partie date pour ne pas
// changer de jour selon le fuseau.
export const formatTournamentDay = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

export const venueLabel = (t) => [t.venue, t.town].filter(Boolean).join(", ");

// Joueurs inscrits à un tournoi, chacun avec ses séries.
export function playersOf(tournament) {
  const players = new Map();
  for (const e of tournament.entries) {
    if (!players.has(e.player.id)) players.set(e.player.id, { player: e.player, series: [] });
    if (e.serieName) players.get(e.player.id).series.push(e.serieName);
  }
  return [...players.values()];
}
