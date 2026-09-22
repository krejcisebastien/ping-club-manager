// Administrateurs de la plateforme (le propriétaire du produit, pas un club) :
// liste d'emails dans PLATFORM_ADMIN_EMAILS, séparés par des virgules. Ces
// adresses sont réservées : on ne peut pas s'inscrire avec ni créer de compte
// avec (sinon quelqu'un pourrait s'attribuer l'adresse avant son propriétaire) ;
// le compte se crée avec la commande `npm run club -- create`.
const platformEmails = () =>
  (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const isPlatformAdmin = (email) => !!email && platformEmails().includes(email.trim().toLowerCase());
