// Nom du produit affiché avant la connexion (écran de connexion, titre de
// l'onglet). Une fois connecté, l'app affiche le nom du club de l'utilisateur
// (auth.user.clubName), qui vient de la base — plus de build par club.
export const CLUB_NAME = import.meta.env.VITE_CLUB_NAME || "Club Tennis de Table";
export const CLUB_ICON = import.meta.env.VITE_CLUB_ICON || "pi-star-fill";
