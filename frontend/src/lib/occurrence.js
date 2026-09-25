// Statut affiché d'une séance. En base il n'existe que PLANNED / CANCELLED : le
// reste se déduit de la date et des présences déjà encodées.
export function occurrenceEnd(o) {
  const d = new Date(o.date);
  const [h, m] = o.endTime.split(":").map(Number);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
}

export function occurrenceState(o, now = new Date()) {
  if (o.status === "CANCELLED") return { label: "Annulée", severity: "danger", color: "#94a3b8" };
  if (occurrenceEnd(o) > now) return { label: "À venir", severity: "info", color: "#0284c7" };
  if ((o._count?.attendances ?? 0) > 0) return { label: "Terminée", severity: "success", color: "#16a34a" };
  return { label: "Présences à encoder", severity: "warn", color: "#f59e0b" };
}
