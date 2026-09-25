// Statuts de présence partagés entre les écrans de pointage (entrainements et
// stages) et les vues de consultation (fiche joueur, espace joueur).
export const ATTENDANCE_STATUS_OPTIONS = [
  { label: "Présent", value: "PRESENT" },
  { label: "Absent", value: "ABSENT" },
  { label: "Retard", value: "LATE" },
  { label: "Excusé", value: "EXCUSED" },
];

export const ATTENDANCE_STATUS_LABELS = Object.fromEntries(ATTENDANCE_STATUS_OPTIONS.map((o) => [o.value, o.label]));

export const ATTENDANCE_STATUS_COLORS = {
  PRESENT: { bg: "#dcfce7", fg: "#166534" },
  LATE: { bg: "#fef3c7", fg: "#92400e" },
  EXCUSED: { bg: "#e0f2fe", fg: "#075985" },
  ABSENT: { bg: "#fee2e2", fg: "#991b1b" },
};

// Aucune présence encodée pour ce joueur (ni présent ni absent : hors statistiques).
ATTENDANCE_STATUS_COLORS.NONE = { bg: "#f1f5f9", fg: "#64748b" };
export const colorsFor = (status) => ATTENDANCE_STATUS_COLORS[status ?? "NONE"];

export const ATTENDANCE_STATUS_SEVERITY = {
  PRESENT: "success",
  LATE: "warn",
  EXCUSED: "info",
  ABSENT: "danger",
};
