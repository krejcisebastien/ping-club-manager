# Déploiement

L'application est conçue pour qu'**un club = une instance** : chaque club dispose de son propre déploiement Render (site + API) et de sa propre base de données, à partir du même code source. Il n'y a pas de partage de données entre clubs — l'isolation est totale par construction, pas besoin de gérer un `club_id` dans chaque table.

## Déployer la première instance (ou une instance de test)

1. Pousser le dépôt sur GitHub/GitLab.
2. Sur Render, créer un nouveau **Blueprint** en pointant vers ce dépôt (`render.yaml` à la racine). Ça crée d'un coup la base Postgres, le service API et le site statique.
3. `CORS_ORIGIN` et `VITE_API_URL` sont préremplis dans `render.yaml` avec les URLs `onrender.com` attendues (basées sur les noms de service). Si Render suffixe un nom de service (nom déjà pris par quelqu'un d'autre sur onrender.com), corrige la valeur concernée dans l'onglet **Environment** du service concerné, puis redéploie (le frontend a besoin d'un nouveau build, pas juste d'un restart, car Vite fige les variables d'environnement au moment de la compilation).
4. Exécuter le seed du compte admin (Shell Render sur le service API) : `npm run seed`. Le compte créé est `admin@ping-club-manager.local` / `changeme123` par défaut — voir ci-dessous pour le personnaliser.
5. Renseigner `RESEND_API_KEY` dans l'onglet **Environment** du service API (clé générée sur resend.com — pas de valeur par défaut dans `render.yaml` car c'est un secret). Sans ça, le lien "mot de passe oublié" ne pourra pas envoyer d'email.

## Déployer une nouvelle instance pour un autre club

Répète ces étapes pour chaque nouveau club, à partir du même dépôt (une branche ou un fork séparé n'est pas nécessaire — un `render.yaml` distinct par Blueprint suffit).

### 1. Dupliquer et adapter `render.yaml`

Le plus simple est de copier `render.yaml` dans un fichier séparé (ex. `render.<club>.yaml`) ou d'adapter les noms directement si tu déploies un Blueprint par dépôt. Dans tous les cas, remplace le préfixe `ping-club-manager` par un nom court propre au club dans :

- `databases[0].name`, `databaseName`, `user`
- `services[0].name` (API) et `services[1].name` (site)
- les deux références croisées `CORS_ORIGIN` (pointe vers le nom du service site) et `VITE_API_URL` (pointe vers le nom du service API + `/api`)

### 2. Personnaliser le nom affiché dans l'app

Dans `envVars` du service **site** (frontend), ajuste :

```yaml
- key: VITE_CLUB_NAME
  value: Nom du club
# - key: VITE_CLUB_ICON      # optionnel, une classe PrimeIcons (pi-xxx), défaut pi-star-fill
#   value: pi-star-fill
```

Ça met à jour le titre de l'onglet, l'écran de connexion et la barre latérale — aucun changement de code nécessaire. (La couleur d'accent bleue reste fixe pour l'instant ; un thème par club n'est pas encore supporté.)

### 3. Créer le Blueprint et déployer

Sur Render, crée un nouveau Blueprint pointant vers ce dépôt avec le fichier `render.yaml` adapté (ou le nom de fichier choisi, selon comment Render le permet — sinon, déployer les 3 ressources manuellement en suivant les mêmes réglages).

### 4. Seed du compte admin du club

Dans l'onglet **Environment** du nouveau service API, définis avant le seed (ou passe-les en ligne de commande) :

```
SEED_ADMIN_EMAIL=admin@<club>.local
SEED_ADMIN_PASSWORD=<mot de passe fort>
```

Puis, dans le Shell Render du service API : `npm run seed`.

### 5. Créer la première saison et les données du club

Le seed ne crée que le compte admin — connecte-toi ensuite dans l'application pour créer la saison, les joueurs, entraineurs, groupes, etc. propres à ce club.

## Ce qui reste partagé entre toutes les instances

Uniquement le **code source**. Une évolution du code (nouvelle fonctionnalité, correctif) doit être redéployée manuellement sur chaque instance de club (redeploy du service concerné sur Render). Il n'y a pas de mécanisme de mise à jour automatique groupée pour l'instant.
