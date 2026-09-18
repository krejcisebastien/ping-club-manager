// Convertit un jour JS (0=dimanche..6=samedi) vers notre convention (0=lundi..6=dimanche).
function toOurWeekday(jsDay) {
  return (jsDay + 6) % 7;
}

// Retourne la liste des dates (à minuit UTC) comprises entre startDate et endDate (inclus)
// qui tombent sur le jour de semaine demandé.
export function datesForWeekday(startDate, endDate, weekday) {
  const dates = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

  while (cursor <= end) {
    if (toOurWeekday(cursor.getUTCDay()) === weekday) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

// Retourne la liste de toutes les dates (à minuit UTC) comprises entre
// startDate et endDate (inclus), un jour à la fois.
export function datesInRange(startDate, endDate) {
  const dates = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
