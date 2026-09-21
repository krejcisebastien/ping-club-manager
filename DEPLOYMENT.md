# Déploiement

L'application est **multi-tenant** : un seul déploiement (site + API + base Postgres) sert tous les clubs. Chaque club ne voit que ses propres données (saisons, comptes, joueurs, entraineurs, sparrings, exercices, stages…) — l'isolation est appliquée automatiquement côté API (voir « Isolation des données » plus bas).

## Déployer l'application

1. Pousser le dépôt sur GitHub/GitLab.
2. Sur Render, créer un nouveau **Blueprint** en pointant vers ce dépôt (`render.yaml` à la racine). Ça crée la base Postgres, le service API et le site statique.
3. `CORS_ORIGIN` et `VITE_API_URL` sont préremplis dans `render.yaml` avec les URLs `onrender.com` attendues (basées sur les noms de service). Si Render suffixe un nom de service (nom déjà pris), corrige la valeur concernée dans l'onglet **Environment**, puis redéploie (le frontend a besoin d'un nouveau build, pas juste d'un restart, car Vite fige les variables d'environnement à la compilation).
4. Renseigner `RESEND_API_KEY` dans l'onglet **Environment** du service API (clé générée sur resend.com — pas de valeur par défaut dans `render.yaml` car c'est un secret). Sans ça, « mot de passe oublié » ne pourra pas envoyer d'email.
5. Les migrations s'appliquent automatiquement au déploiement (`prisma migrate deploy`). La migration multi-tenant rattache les données déjà présentes à un club par défaut (slug `default`).
6. Dans le Shell Render du service API : `npm run seed` crée le compte admin du club par défaut (`admin@ping-club-manager.local` / `changeme123`, modifiables via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Gérer les clubs

Dans le Shell Render du service API (ou en local dans `backend/`) :

```bash
# Lister les clubs
npm run club -- list

# Créer un club et son premier administrateur
npm run club -- create --name "Nom du club" --admin-email admin@club.be --admin-password "mot de passe fort"

# Renommer un club (ex. le club par défaut créé par la migration)
npm run club -- rename --slug default --name "Nom du club"
```

L'administrateur du nouveau club se connecte ensuite avec son email : l'application retrouve son club automatiquement, il n'y a pas de code club à saisir. Il crée lui-même saisons, joueurs, entraineurs, groupes, etc. et les comptes de ses membres depuis l'application.

Un email de compte est **unique sur toute la plateforme** (un compte = un club).

## Isolation des données

- Les entités racines (saisons, comptes, joueurs, entraineurs, sparrings, exercices) portent un `clubId` ; tout le reste s'en déduit par les relations.
- Chaque requête authentifiée reçoit un client Prisma restreint à son club (`backend/src/lib/tenant.js`) : les lectures/modifications/suppressions sont filtrées automatiquement, et tout identifiant référencé à l'écriture (joueur, entraineur, saison…) doit appartenir au même club, sinon la requête est refusée (404). Les routes utilisent `req.db`, jamais le client global, sauf connexion et réinitialisation de mot de passe.
- Le jeton de connexion contient le `clubId` ; un jeton sans club est refusé (il faut se reconnecter).
- Test de non-régression : `npm run test:isolation` (dans `backend/`, base de données requise). Il crée deux clubs temporaires, tente d'accéder à/modifier/se rattacher des données de l'un depuis l'autre, puis nettoie. À relancer après toute modification des routes ou du schéma.

Supprimer un club supprime en cascade toutes ses données.

## Ce qui n'est pas encore là

- Pas de création de club en libre-service ni d'interface d'administration de la plateforme (création via la commande ci-dessus).
- Pas de facturation/abonnement.
- Le thème (couleur d'accent) est le même pour tous les clubs.
