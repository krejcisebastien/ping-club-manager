# Déploiement

L'application est **multi-tenant** : un seul déploiement (site + API + base Postgres) sert tous les clubs. Chaque club ne voit que ses propres données (saisons, comptes, joueurs, entraineurs, sparrings, exercices, stages…) — l'isolation est appliquée automatiquement côté API (voir « Isolation des données » plus bas).

## Déployer l'application

1. Pousser le dépôt sur GitHub/GitLab.
2. Sur Render, créer un nouveau **Blueprint** en pointant vers ce dépôt (`render.yaml` à la racine). Ça crée la base Postgres, le service API et le site statique.
3. `CORS_ORIGIN` et `VITE_API_URL` sont préremplis dans `render.yaml` avec les URLs `onrender.com` attendues (basées sur les noms de service). Si Render suffixe un nom de service (nom déjà pris), corrige la valeur concernée dans l'onglet **Environment**, puis redéploie (le frontend a besoin d'un nouveau build, pas juste d'un restart, car Vite fige les variables d'environnement à la compilation).
4. Renseigner `RESEND_API_KEY` dans l'onglet **Environment** du service API (clé générée sur resend.com — pas de valeur par défaut dans `render.yaml` car c'est un secret). Sans ça, « mot de passe oublié » ne pourra pas envoyer d'email.
   Renseigner aussi `ANTHROPIC_API_KEY` (console.anthropic.com) pour activer la génération d'exercices et de plans d'entrainement par IA — optionnel, sans cette clé les boutons "Générer avec l'IA" renvoient juste une erreur explicite.
5. Les migrations s'appliquent automatiquement au déploiement (`prisma migrate deploy`). La migration multi-tenant rattache les données déjà présentes à un club par défaut (slug `default`).
6. Dans le Shell Render du service API : `npm run seed` crée le compte admin du club par défaut (`admin@ping-club-manager.local` / `changeme123`, modifiables via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Gérer les clubs

Dans le Shell Render du service API (ou en local dans `backend/`) :

```bash
# Lister les clubs
npm run club -- list

# Créer un club et son premier administrateur, avec sa licence (club payé sur facture)
npm run club -- create --name "Nom du club" --admin-email admin@club.be --admin-password "mot de passe fort" --until 2027-09-30

# Renommer un club (ex. le club par défaut créé par la migration)
npm run club -- rename --slug default --name "Nom du club"

# Activer ou renouveler une licence (facture réglée)
npm run club -- license --slug nom-du-club --years 1        # prolonge d'un an
npm run club -- license --slug nom-du-club --until 2027-09-30   # fixe la date
```

L'administrateur du nouveau club se connecte ensuite avec son email : l'application retrouve son club automatiquement, il n'y a pas de code club à saisir. Il crée lui-même saisons, joueurs, entraineurs, groupes, etc. et les comptes de ses membres depuis l'application.

Un email de compte est **unique sur toute la plateforme** (un compte = un club).

## Licences

Chaque club a une **licence annuelle** (`licenseEndsAt`). Sans licence valide, l'API refuse toutes les requêtes de données (erreur 402) ; l'application renvoie alors l'utilisateur vers la page **Licence**, seule page accessible (avec la connexion et le changement de mot de passe). Après l'échéance, **7 jours de grâce** laissent l'accès ouvert (le temps que Stripe retente un paiement ou qu'une facture soit réglée), avec un bandeau d'avertissement pour les administrateurs ; les 30 derniers jours affichent aussi un bandeau.

| État | Signification |
| --- | --- |
| `PENDING` | jamais de licence (club fraîchement inscrit) : accès refusé |
| `ACTIVE` | licence en cours |
| `GRACE` | échue depuis moins de 7 jours : accès maintenu |
| `EXPIRED` | échue depuis plus de 7 jours : accès refusé |

Les clubs qui existaient avant la mise en place des licences sont conservés actifs jusqu'au 31/12/2099 par la migration (pour ne pas être verrouillés) : ajuste-les avec `npm run club -- license` si besoin. Le statut est mis en cache 30 s côté API, donc un changement fait par la commande est effectif sous 30 s.

**Deux façons d'obtenir une licence, combinables :**

1. **Facture / virement** : tu factures le club, puis `npm run club -- license --slug … --years 1` (ou `create … --until …` pour un nouveau club).
2. **Paiement en ligne (Stripe)** : l'administrateur du club clique sur « Activer la licence » (page Licence), paie par carte sur Stripe Checkout, et l'accès s'ouvre automatiquement. Il peut ensuite gérer sa carte, télécharger ses factures et résilier via le portail client Stripe.

### Configurer Stripe

1. Sur dashboard.stripe.com (commence en **mode test**), crée un **produit** avec un prix **récurrent annuel** (montant et devise au choix) et note l'identifiant du prix (`price_…`).
2. Renseigne dans l'onglet **Environment** du service API (et dans `backend/.env` pour tester en local) :
   - `STRIPE_SECRET_KEY` : clé secrète (`sk_test_…` en test, `sk_live_…` en production) ;
   - `STRIPE_PRICE_ID` : identifiant du prix (`price_…`) ;
   - `STRIPE_WEBHOOK_SECRET` : voir l'étape suivante.
3. Crée un **endpoint webhook** (Developers → Webhooks) vers `https://<url-de-ton-api>/api/billing/webhook` avec les événements `checkout.session.completed` et `invoice.paid`, et copie son secret de signature (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`. En local : `stripe listen --forward-to localhost:4000/api/billing/webhook` (Stripe CLI) donne un secret temporaire.
4. Dans Stripe → Settings → Billing → **Customer portal**, active le portail (résiliation, moyens de paiement, factures).
5. Optionnel : `VITE_SUPPORT_EMAIL` (service site) affiche une adresse de contact pour le règlement par facture sur la page Licence.

Fonctionnement : au paiement, `checkout.session.completed` lie le club à son client/abonnement Stripe et ouvre la licence pour un an ; à chaque facture payée (`invoice.paid`, dont les renouvellements), la licence est prolongée jusqu'à la fin de la période facturée — jamais raccourcie. Un abonnement résilié ou impayé n'est pas coupé brutalement : la licence s'arrête naturellement à son échéance (+ grâce). Sans clés Stripe, le bouton de paiement n'apparaît pas et seule l'activation manuelle est possible.

## Création de club en libre-service

Une page publique `/signup` (« Créer mon club », lien sur l'écran de connexion) permet à n'importe qui de créer son club et de devenir son premier administrateur : il est connecté directement, mais **sans licence** : il arrive sur la page Licence et doit la régler (Stripe ou facture) avant d'utiliser l'application.

- **Désactivée par défaut.** Pour l'ouvrir, définir `ALLOW_CLUB_SIGNUP=true` dans l'onglet **Environment** du service API. Tant que ce n'est pas fait, la page affiche « La création de club n'est pas ouverte » et l'API répond 404. Ne l'active que le jour où tu veux vraiment accepter des inscriptions.
- Limite de 5 tentatives par heure et par adresse IP (en mémoire : à remplacer par un stockage partagé si l'API tourne sur plusieurs instances).
- Les tests : `npm test` (isolation, inscription et licences).

## Isolation des données

- Les entités racines (saisons, comptes, joueurs, entraineurs, sparrings, exercices) portent un `clubId` ; tout le reste s'en déduit par les relations.
- Chaque requête authentifiée reçoit un client Prisma restreint à son club (`backend/src/lib/tenant.js`) : les lectures/modifications/suppressions sont filtrées automatiquement, et tout identifiant référencé à l'écriture (joueur, entraineur, saison…) doit appartenir au même club, sinon la requête est refusée (404). Les routes utilisent `req.db`, jamais le client global, sauf connexion et réinitialisation de mot de passe.
- Le jeton de connexion contient le `clubId` ; un jeton sans club est refusé (il faut se reconnecter).
- Test de non-régression : `npm run test:isolation` (dans `backend/`, base de données requise). Il crée deux clubs temporaires, tente d'accéder à/modifier/se rattacher des données de l'un depuis l'autre, puis nettoie. À relancer après toute modification des routes ou du schéma.

Supprimer un club supprime en cascade toutes ses données.

## Ce qui n'est pas encore là

- Pas de vérification de l'email à l'inscription : n'importe qui peut créer un club (sans licence, donc inutilisable) avec l'adresse de quelqu'un d'autre, ce qui bloque ensuite l'inscription de la vraie personne (qui peut toutefois récupérer le compte via « mot de passe oublié »). À traiter avant d'ouvrir l'inscription au public ; pas de nettoyage automatique des clubs jamais payés non plus.
- Pas de conditions d'utilisation ni de politique de confidentialité à accepter à l'inscription (à rédiger, avec un avis juridique vu les données de mineurs).
- Pas d'interface d'administration de la plateforme (liste/suspension des clubs) : gestion via `npm run club`.
- Pas de facturation automatique des conditions particulières (tarifs par taille de club, remises) : un seul prix annuel, pour l'instant.
- Le thème (couleur d'accent) est le même pour tous les clubs.
