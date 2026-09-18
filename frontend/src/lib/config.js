// Personnalisation par instance/club, sans changement de code : chaque
// déploiement Render définit ses propres VITE_CLUB_* (voir DEPLOYMENT.md).
export const CLUB_NAME = import.meta.env.VITE_CLUB_NAME || "Club Tennis de Table";
export const CLUB_ICON = import.meta.env.VITE_CLUB_ICON || "pi-star-fill";
