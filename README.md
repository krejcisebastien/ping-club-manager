# ping-club-manager

Application de gestion d'un club de tennis de table : saisons, joueurs, entraineurs, groupes d'entrainement, entrainements, stages, présences.

## Structure

- `backend/` — API REST Node.js (Express) + PostgreSQL (Prisma ORM), authentification JWT par rôle (`ADMIN`, `COACH`, `PLAYER`).
- `frontend/` — application Vue 3 (Vite, Vue Router, Pinia, Tailwind CSS), responsive pc/tablette/mobile.
- `render.yaml` — Blueprint Render (base Postgres + service API + site statique).

Voir le plan de conception complet (modèle de données, API, écrans, phasage) pour le détail des choix.

## Démarrage local

### Prérequis

- Node.js 20+
- PostgreSQL (local ou distant)

### Backend

```bash
cd backend
cp .env.example .env   # renseigner DATABASE_URL et JWT_SECRET
npm install
npm run migrate:dev     # crée le schéma en base
npm run seed             # crée le compte admin initial
npm run dev
```

Le compte admin créé par défaut est `admin@ping-club-manager.local` / `changeme123` (modifiable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev
```

L'application est accessible sur http://localhost:5173.

## Déploiement sur Render (Blueprint)

1. Pousser le dépôt sur GitHub/GitLab.
2. Sur Render, créer un nouveau **Blueprint** en pointant vers ce dépôt (`render.yaml` à la racine).
3. Après le premier déploiement, renseigner manuellement :
   - `CORS_ORIGIN` sur le service `ping-club-manager-api` avec l'URL publique de `ping-club-manager-web`.
   - `VITE_API_URL` sur le service `ping-club-manager-web` avec l'URL publique de `ping-club-manager-api` + `/api`, puis redéployer le frontend (Vite fige les variables au build).
4. Exécuter le seed du compte admin (Shell Render sur `ping-club-manager-api`) : `npm run seed`.

## État actuel

**Phase 1 — Socle** : schéma de données complet (toutes les entités du cahier des charges), authentification JWT par rôle, CRUD saisons/joueurs (+ classement, matériel, points forts/défauts, points à travailler, notes d'évolution)/entraineurs.

**Phase 2 — Entrainements** : groupes d'entrainement (composition, changement de groupe en cours de saison), entrainements récurrents + génération automatique des séances (occurrences), affectation d'entraineurs/sparrings à une séance, prise de présence par l'entraineur, historique de participation consultable par le joueur. Écrans admin (`/admin/groups`, `/admin/trainings`) et entraineur (`/coach/attendance`) correspondants.

**Phase 3 — Stages** : stages avec journées, périodes (matinée/après-midi ou autre) et groupes libres (initiation, perfectionnement, psychomotricité...), affectation d'un ou plusieurs groupes par période, affectation d'entraineurs et inscription de joueurs par groupe/période, prise de présence dédiée, historique consultable par le joueur. Écrans admin (`/admin/camps`) et entraineur (`/coach/camps`) correspondants.

**Phase 4 — Contenu pédagogique** : bibliothèque d'exercices et plans d'entrainement globaux par saison (rattachement d'exercices à un plan). Écrans `/coach/exercises` et `/coach/training-plans`, accessibles à l'admin et aux entraineurs.

Prochaine phase : finalisation des écrans par rôle (calendriers visuels type FullCalendar, PWA installable) — voir le plan de conception initial pour le détail.
