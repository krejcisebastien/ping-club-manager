// Convertit un objet Date (choisi via un Calendar PrimeVue, en heure locale) en
// chaîne "AAAA-MM-JJ" sans passer par toISOString(), qui décale la date d'un
// jour pour les fuseaux horaires en avance sur UTC (ex. Europe).
export function toDateOnly(date) {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
