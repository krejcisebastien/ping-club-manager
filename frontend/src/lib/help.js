// Manuel utilisateur affiché dans la page Aide (/help).
//
// Chaque chapitre indique les rôles qui le voient (null = tout le monde) ;
// l'administrateur voit aussi le chapitre Entraineur, car il a accès aux mêmes
// écrans. Le contenu est du HTML statique écrit ici (jamais de saisie
// utilisateur) : garder des balises simples (p, ul, ol, li, strong, em).
// Quand un écran change, mettre à jour la section correspondante.

export const HELP_CHAPTERS = [
  {
    id: "start",
    title: "Premiers pas",
    icon: "pi pi-compass",
    roles: null,
    sections: [
      {
        id: "login",
        title: "Se connecter",
        body: `
<p>Ton compte est créé par un administrateur du club, qui te communique ton adresse email et un premier mot de passe.</p>
<ol>
  <li>Ouvre le site du club et saisis ton <strong>Email</strong> et ton <strong>Mot de passe</strong>.</li>
  <li>Clique sur <strong>Se connecter</strong> : tu arrives sur la page d'accueil de ton rôle.</li>
</ol>
<p>Pour des raisons de sécurité, la connexion expire au bout de quelques heures : il suffit alors de te reconnecter.</p>`,
      },
      {
        id: "forgot-password",
        title: "Mot de passe oublié",
        body: `
<ol>
  <li>Sur l'écran de connexion, clique sur <strong>Mot de passe oublié ?</strong></li>
  <li>Indique ton email puis clique sur <strong>Envoyer le lien</strong>.</li>
  <li>Ouvre l'email reçu (pense à vérifier tes spams) et choisis un nouveau mot de passe.</li>
</ol>
<p>Le lien n'est valable qu'<strong>une heure</strong>. Passé ce délai, recommence la demande.</p>`,
      },
      {
        id: "change-password",
        title: "Changer mon mot de passe",
        body: `
<ol>
  <li>En bas du menu, à côté de ton adresse email, clique sur l'icône <strong>cadenas</strong>.</li>
  <li>Saisis ton mot de passe actuel, puis deux fois le nouveau.</li>
  <li>Clique sur <strong>Enregistrer</strong>.</li>
</ol>`,
      },
      {
        id: "navigation",
        title: "Se repérer dans l'application",
        body: `
<ul>
  <li><strong>Sur ordinateur</strong>, le menu est affiché en permanence à gauche.</li>
  <li><strong>Sur téléphone</strong>, touche l'icône <strong>☰</strong> en haut à gauche pour ouvrir le menu.</li>
  <li>Dans les listes, <strong>clique sur une ligne</strong> pour ouvrir l'élément. Le <strong>crayon</strong> permet de modifier et la <strong>corbeille</strong> de supprimer (une confirmation est toujours demandée).</li>
  <li>La zone <strong>Rechercher…</strong> au-dessus des listes filtre instantanément les résultats.</li>
  <li>Pour te déconnecter, clique sur l'icône de <strong>sortie</strong> en bas du menu.</li>
</ul>`,
      },
      {
        id: "roles",
        title: "Plusieurs rôles sur un même compte",
        body: `
<p>Un compte peut être à la fois <strong>Administrateur</strong>, <strong>Entraineur</strong> et <strong>Joueur</strong>. Le menu n'affiche que les écrans du rôle actif.</p>
<p>Pour passer d'un rôle à l'autre, utilise les boutons <strong>Administrateur / Entraineur / Joueur</strong> en bas du menu.</p>
<p><strong>Compte familial :</strong> un compte joueur peut être rattaché à plusieurs joueurs (par exemple des frères et sœurs). Utilise <strong>Changer de joueur</strong> dans le menu pour passer de l'un à l'autre.</p>`,
      },
      {
        id: "install",
        title: "Installer l'application sur mon téléphone",
        body: `
<p>L'application peut être ajoutée à l'écran d'accueil comme une vraie app : elle s'ouvre alors en plein écran, sans barre d'adresse.</p>
<ul>
  <li><strong>iPhone / iPad :</strong> ouvre le site dans <strong>Safari</strong>, touche le bouton <strong>Partager</strong> (carré avec une flèche) puis <strong>Sur l'écran d'accueil</strong> et <strong>Ajouter</strong>.</li>
  <li><strong>Android :</strong> ouvre le site dans <strong>Chrome</strong>, menu <strong>⋮</strong> puis <strong>Installer l'application</strong> (ou <strong>Ajouter à l'écran d'accueil</strong>).</li>
  <li><strong>Ordinateur :</strong> dans Chrome ou Edge, clique sur l'icône d'installation au bout de la barre d'adresse.</li>
</ul>
<p>Quand une nouvelle version est publiée, un bandeau <strong>Nouvelle version disponible</strong> apparaît : clique sur <strong>Mettre à jour</strong>.</p>`,
      },
    ],
  },
  {
    id: "player",
    title: "Espace joueur",
    icon: "pi pi-user",
    roles: ["PLAYER"],
    sections: [
      {
        id: "player-dashboard",
        title: "Mon tableau de bord",
        body: `
<p>La page d'accueil résume ta saison :</p>
<ul>
  <li><strong>Niveau global</strong> : moyenne sur 10 de ta dernière évaluation.</li>
  <li><strong>Présence entrainements</strong> et <strong>Présence stages</strong> : ton taux de présence et les heures cumulées sur la saison.</li>
  <li><strong>À travailler</strong> : le nombre de points que ton entraineur t'a demandé de travailler.</li>
  <li><strong>Mon profil de jeu</strong> : un graphique radar de tes qualités, avec ton point fort et ton point à progresser.</li>
  <li><strong>Ce que dit mon entraineur</strong> : ses derniers commentaires.</li>
</ul>
<p>Les statistiques portent sur la saison active du club, sinon sur la saison en cours.</p>`,
      },
      {
        id: "player-evaluation",
        title: "Mon évaluation",
        body: `
<p>Ton entraineur t'évalue sur 8 critères notés sur 10 : service, remise, coup droit, revers, déplacements, tactique, mental et physique.</p>
<ul>
  <li>Les flèches <strong>▲ / ▼</strong> montrent ta progression depuis l'évaluation précédente.</li>
  <li>Le <strong>radar</strong> compare ta dernière évaluation (trait plein) à la précédente (pointillés).</li>
  <li>La courbe <strong>Évolution</strong> apparaît à partir de la 2<sup>e</sup> évaluation.</li>
  <li>L'<strong>Historique</strong> liste toutes tes évaluations avec leur moyenne.</li>
</ul>`,
      },
      {
        id: "player-follow-up",
        title: "Mon suivi",
        body: `
<ul>
  <li><strong>Points à travailler</strong>, avec leur état : <em>à faire</em>, <em>en cours</em> ou <em>acquis</em>.</li>
  <li><strong>Points forts et défauts</strong> relevés par tes entraineurs.</li>
  <li><strong>Notes d'évolution</strong> datées.</li>
  <li><strong>Classement et matériel</strong> : l'historique de tes classements et ton matériel actuel.</li>
</ul>
<p>Ces informations sont tenues à jour par les entraineurs ; tu peux les consulter mais pas les modifier.</p>`,
      },
      {
        id: "player-attendance",
        title: "Mes présences",
        body: `
<p>Tu y retrouves chaque entrainement et chaque période de stage avec ton statut : <strong>Présent</strong>, <strong>Absent</strong>, <strong>Retard</strong> ou <strong>Excusé</strong>.</p>
<p>Une séance n'apparaît qu'une fois que l'entraineur a encodé les présences.</p>`,
      },
      {
        id: "player-profile",
        title: "Ma fiche",
        body: `
<p>Tu peux mettre à jour toi-même :</p>
<ul>
  <li>ta <strong>photo</strong> (1 Mo maximum), ton <strong>nom</strong>, ton <strong>prénom</strong> et ta <strong>date de naissance</strong> ;</li>
  <li>ton <strong>téléphone</strong> et ton <strong>contact d'urgence</strong> (nom et numéro) ;</li>
  <li>ta <strong>main</strong> (droitier ou gaucher).</li>
</ul>
<p>Clique sur <strong>Enregistrer</strong> pour valider. Le <strong>n° de licence</strong> et le <strong>style de jeu</strong> sont gérés par le club et ton entraineur.</p>`,
      },
    ],
  },
  {
    id: "coach",
    title: "Espace entraineur",
    icon: "pi pi-users",
    roles: ["COACH", "ADMIN"],
    sections: [
      {
        id: "coach-dashboard",
        title: "Tableau de bord entraineur",
        body: `
<ul>
  <li>Les compteurs indiquent le nombre de joueurs, de séances et de périodes de stage des 7 prochains jours, et les <strong>présences en attente</strong>.</li>
  <li>Le bloc <strong>Présences pas encore pointées</strong> liste les séances passées sans présences : clique sur <strong>Pointer</strong> pour les encoder.</li>
  <li>Les listes <strong>Entrainements</strong> et <strong>Stages — 7 prochains jours</strong> donnent l'horaire, le groupe et les encadrants.</li>
</ul>`,
      },
      {
        id: "coach-attendance",
        title: "Encoder les présences d'un entrainement",
        body: `
<ol>
  <li>Menu <strong>Présences entrainements</strong> : choisis la <strong>Saison</strong> puis l'<strong>Entrainement</strong>. <em>Administrateur : passe par <strong>Entrainements</strong>, ouvre l'entrainement puis le bouton <strong>Présences</strong> de la séance.</em></li>
  <li>Clique sur la séance. Son statut est indiqué : <em>À venir</em>, <em>Présences à encoder</em>, <em>Terminée</em> ou <em>Annulée</em>.</li>
  <li>Pour chaque joueur du groupe, choisis <strong>Présent</strong>, <strong>Absent</strong>, <strong>Retard</strong> ou <strong>Excusé</strong>, avec une note si besoin. Les boutons <strong>Tous présents</strong> / <strong>Tous absents</strong> font gagner du temps.</li>
  <li>Clique sur <strong>Enregistrer</strong>.</li>
</ol>
<p>Un joueur laissé sur <em>À encoder</em> est « non encodé » : il n'est pas compté absent et n'entre pas dans les statistiques.</p>
<p>Erreur de séance ? <strong>Annuler l'encodage</strong> efface toutes les présences de cette séance.</p>`,
      },
      {
        id: "coach-camps",
        title: "Stages : inscrits, répartition et présences",
        body: `
<p>Menu <strong>Présences stages</strong>, puis choisis la <strong>Saison</strong> et le <strong>Stage</strong>. <em>Administrateur : depuis <strong>Stages</strong>, ouvre le stage et utilise <strong>Répartir les joueurs</strong> ou <strong>Présences de la journée</strong>.</em></p>
<ol>
  <li><strong>Joueurs inscrits</strong> : inscris les participants avec <strong>Inscrire un joueur…</strong>. Cette liste sert de référence pour les présences.</li>
  <li><strong>Répartition</strong> (par journée) : pour chaque période (matinée, après-midi…), place chaque inscrit dans un groupe. Un joueur n'est que dans un seul groupe par période. Le bouton <strong>Copier « Matinée » vers « Après-midi »</strong> reprend la répartition de la période précédente.</li>
  <li><strong>Présences</strong> (par journée) : indique le statut de chaque inscrit pour chaque période. <strong>Journée entière</strong> le marque présent sur toutes les périodes ; <strong>Tous présents (journée)</strong> fait de même pour tout le monde.</li>
  <li>Clique sur <strong>Enregistrer</strong>.</li>
</ol>
<p><strong>Annuler l'encodage</strong> efface toutes les présences de la journée.</p>`,
      },
      {
        id: "coach-players",
        title: "Suivre un joueur",
        body: `
<p>Menu <strong>Joueurs</strong>, puis clique sur un joueur pour ouvrir sa fiche :</p>
<ul>
  <li><strong>Signalétique</strong> : coordonnées, n° de licence, main dominante, style de jeu, contact d'urgence.</li>
  <li><strong>Statistiques</strong> de présence par saison.</li>
  <li><strong>Classement</strong> : choisis la saison et le classement, puis <strong>Ajouter</strong>.</li>
  <li><strong>Évaluation sportive</strong> : règle les 8 curseurs (0 à 10), ajoute un commentaire puis <strong>Enregistrer l'évaluation</strong>. Le joueur la voit dans son espace.</li>
  <li><strong>Matériel</strong> : ajoute une raquette ou un revêtement ; <strong>clôturer</strong> le retire du matériel actuel en gardant l'historique.</li>
  <li><strong>Points forts / défauts</strong>, <strong>Points à travailler</strong> (avec leur état) et <strong>Notes d'évolution</strong>.</li>
</ul>`,
      },
      {
        id: "coach-groups",
        title: "Composer les groupes",
        body: `
<p>Menu <strong>Groupes</strong> : choisis la saison, puis clique sur un groupe pour voir ses joueurs.</p>
<ul>
  <li>Ajoute un joueur avec <strong>Ajouter un joueur…</strong> puis <strong>Ajouter</strong>.</li>
  <li>Retire-le avec la <strong>croix</strong>.</li>
</ul>
<p>La création et le renommage des groupes sont réservés aux administrateurs.</p>`,
      },
      {
        id: "coach-exercises",
        title: "Bibliothèque d'exercices",
        body: `
<p>Menu <strong>Exercices</strong> : recherche par texte, filtre par catégorie et difficulté.</p>
<ul>
  <li><strong>Nouvel exercice</strong> : titre, catégorie, difficulté et description. Ouvre ensuite l'exercice et clique sur le <strong>crayon</strong> pour compléter l'intensité, l'objectif, les consignes, les critères de réussite, les variantes et le <strong>schéma de la table</strong>.</li>
  <li><strong>Schéma de la table</strong> : clique pour ajouter un point, glisse pour le déplacer, double-clique pour le retirer. Les points sont reliés dans l'ordre pour montrer l'enchaînement des balles.</li>
  <li><strong>Générer avec l'IA</strong> : indique éventuellement une catégorie, une difficulté, les qualités à travailler et des précisions, puis <strong>Générer</strong>. Relis et corrige la proposition avant <strong>Créer l'exercice</strong>, ou clique sur <strong>Régénérer</strong>.</li>
</ul>
<p>La difficulté est notée avec des <strong>biceps</strong> (1 à 5) et l'intensité avec des <strong>éclairs</strong> (1 à 5).</p>`,
      },
      {
        id: "coach-plans",
        title: "Plans d'entrainement",
        body: `
<p>Menu <strong>Plans d'entrainement</strong> : un plan regroupe des exercices pour une séance ou une période.</p>
<ul>
  <li><strong>Nouveau plan</strong> : titre, dates de début et de fin (optionnelles) et description.</li>
  <li>Dans le plan, ajoute des exercices avec <strong>Ajouter un exercice…</strong> puis <strong>Ajouter</strong> ; la croix les retire.</li>
  <li><strong>Générer avec l'IA</strong> : indique un thème et un nombre d'exercices. L'IA choisit uniquement parmi les exercices de la bibliothèque du club ; décoche ceux que tu ne veux pas garder puis <strong>Créer le plan</strong>.</li>
</ul>`,
      },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    icon: "pi pi-cog",
    roles: ["ADMIN"],
    sections: [
      {
        id: "admin-setup",
        title: "Mise en route d'une saison",
        body: `
<p>Ordre conseillé pour préparer une nouvelle saison :</p>
<ol>
  <li><strong>Saison</strong> (Vue d'ensemble) : crée-la et coche <strong>Saison active</strong>.</li>
  <li><strong>Joueurs</strong>, <strong>Entraineurs</strong> et <strong>Sparrings</strong>.</li>
  <li><strong>Groupes</strong> de la saison, puis leurs joueurs.</li>
  <li><strong>Entrainements</strong> : un par créneau hebdomadaire, avec ses encadrants par défaut, puis <strong>générer les séances</strong>.</li>
  <li><strong>Utilisateurs</strong> : crée les comptes pour que chacun puisse se connecter.</li>
  <li><strong>Tarifs</strong> : pour pouvoir sortir les fiches bénévolat.</li>
</ol>`,
      },
      {
        id: "admin-seasons",
        title: "Saisons",
        body: `
<p>Dans <strong>Vue d'ensemble</strong>, clique sur <strong>Nouvelle saison</strong> : nom, dates de début et de fin.</p>
<p>La <strong>saison active</strong> est celle proposée par défaut dans les écrans et utilisée pour les statistiques des joueurs (à défaut, la saison en cours, puis la plus récente).</p>`,
      },
      {
        id: "admin-people",
        title: "Joueurs, entraineurs et sparrings",
        body: `
<ul>
  <li><strong>Joueurs</strong> : <strong>Nouveau joueur</strong> (prénom, nom, date de naissance, n° de licence facultatif). La fiche complète s'ouvre en cliquant sur le joueur (voir « Suivre un joueur »).</li>
  <li><strong>Entraineurs</strong> : nom, <strong>niveau Adeps</strong> (Animateur, MSIN, MSED, MSEN), coordonnées, <strong>adresse</strong> et <strong>IBAN</strong>. Le niveau détermine le tarif ; l'adresse et l'IBAN sont repris sur la note de défraiement.</li>
  <li><strong>Sparrings</strong> : coche <strong>Joueur du club</strong> pour choisir un joueur existant (son nom et son classement sont alors repris de sa fiche), sinon saisis le nom, le classement et le club extérieur. La <strong>série</strong> (E, D, C, B) est déduite du classement ; un NC compte en série E.</li>
</ul>
<p>L'IBAN est vérifié à l'enregistrement : un numéro mal recopié est refusé.</p>`,
      },
      {
        id: "admin-users",
        title: "Comptes utilisateurs",
        body: `
<ol>
  <li>Menu <strong>Utilisateurs</strong> puis <strong>Nouveau compte</strong>.</li>
  <li>Saisis l'email et un mot de passe provisoire, puis choisis un ou plusieurs <strong>rôles</strong>.</li>
  <li>Rôle <strong>Joueur</strong> : rattache un ou plusieurs joueurs (plusieurs = compte familial). Rôle <strong>Entraineur</strong> : rattache la fiche entraineur correspondante.</li>
  <li>Communique l'email et le mot de passe à la personne ; elle pourra le changer (icône cadenas) ou utiliser <strong>Mot de passe oublié ?</strong>.</li>
</ol>
<p>L'icône <strong>interdit</strong> désactive un compte sans le supprimer : la personne ne peut plus se connecter. La même icône (coche) le réactive.</p>`,
      },
      {
        id: "admin-groups",
        title: "Groupes d'entrainement",
        body: `
<p>Menu <strong>Groupes</strong> : choisis la saison puis <strong>Nouveau groupe</strong> (nom et critère de classement facultatif, par ex. « E0 à D4 »).</p>
<p>Clique sur un groupe pour gérer ses joueurs ; le <strong>crayon</strong> le renomme. Les joueurs d'un groupe sont ceux proposés sur les feuilles de présence de ses entrainements.</p>`,
      },
      {
        id: "admin-trainings",
        title: "Entrainements et séances",
        body: `
<ol>
  <li>Menu <strong>Entrainements</strong> : choisis la saison puis <strong>Nouvel entrainement</strong> (nom, groupe, jour de semaine, heures de début et de fin).</li>
  <li>Ouvre-le et ajoute les <strong>Encadrants par défaut</strong> (entraineurs et sparrings) : ils seront affectés à chaque nouvelle séance.</li>
  <li><strong>Générer les séances de la période</strong> : choisis les dates <em>Du</em> et <em>Au</em> puis <strong>Générer</strong>. Une séance est créée pour chaque jour correspondant ; les dates déjà existantes ne sont pas dupliquées.</li>
</ol>
<p>Pour chaque séance (onglet <strong>Liste</strong> ou <strong>Calendrier</strong>) :</p>
<ul>
  <li><strong>Encadrants</strong> : modifier les encadrants de cette séance uniquement (remplacement, renfort…).</li>
  <li><strong>Présences</strong> : ouvrir la feuille de présence.</li>
  <li><strong>Annuler</strong> / <strong>Rétablir</strong> : une séance annulée n'est plus proposée au pointage et n'est pas défrayée. L'annulation est refusée si des présences sont déjà encodées : utilise d'abord <strong>Annuler l'encodage</strong>.</li>
</ul>`,
      },
      {
        id: "admin-camps",
        title: "Stages",
        body: `
<ol>
  <li>Menu <strong>Stages</strong> puis <strong>Nouveau stage</strong> : nom, lieu, dates.</li>
  <li><strong>Groupes du stage</strong> (initiation, perfectionnement…) : <strong>Ajouter</strong>. En cliquant sur un groupe, tu peux lui associer un <strong>plan d'entrainement</strong> et des <strong>encadrants par défaut</strong>.</li>
  <li><strong>Joueurs inscrits</strong> : la liste de référence pour les présences.</li>
  <li><strong>Journées</strong> :
    <ul>
      <li><strong>Ajouter des journées</strong> (du… au…), avec en option les périodes standard (Matinée 09:00–12:00, Après-midi 13:00–16:00) ;</li>
      <li>ou <strong>Générer une période</strong> (libellé, horaire, plage de dates) : elle est ajoutée à chaque journée, qui est créée si besoin.</li>
    </ul>
  </li>
</ol>
<p>Les groupes du stage sont rattachés d'office aux nouvelles périodes. Sur une période, clique sur le nom d'un groupe pour ajuster ses encadrants ou ses joueurs <em>pour cette période uniquement</em>. Les boutons <strong>Répartir les joueurs</strong> et <strong>Présences de la journée</strong> ouvrent les écrans décrits dans « Stages : inscrits, répartition et présences ».</p>`,
      },
      {
        id: "admin-rates",
        title: "Tarifs et plafonds",
        body: `
<p>Menu <strong>Tarifs</strong> :</p>
<ul>
  <li><strong>Entraineurs</strong> : un montant par niveau Adeps. <strong>Sparrings</strong> : un montant par série (E, D, C, B).</li>
  <li>Pour chaque ligne, choisis la base : <strong>à l'heure</strong> (durée × tarif) ou <strong>à la séance</strong> (forfait par séance d'entrainement ou période de stage).</li>
  <li><strong>Plafonds des indemnités de volontariat</strong> : € par jour et € par an, par année civile. Une année sans ligne reprend les plafonds de l'année précédente la plus récente.</li>
</ul>
<p>Clique sur <strong>Enregistrer les tarifs et plafonds</strong>.</p>`,
      },
      {
        id: "admin-volunteering",
        title: "Fiches bénévolat (notes de défraiement)",
        body: `
<ol>
  <li>Menu <strong>Fiches bénévolat</strong> : choisis <strong>Entraineur</strong> ou <strong>Sparring</strong>, la personne et le <strong>mois</strong>.</li>
  <li>La fiche liste une ligne par séance d'entrainement ou période de stage où la personne était affectée <strong>et qui a eu lieu</strong> : les séances annulées ou pas encore passées ne sont pas comptées.</li>
  <li>Vérifie les éventuels avertissements (tarif manquant, plafond journalier ou annuel dépassé) ainsi que l'adresse et l'IBAN affichés.</li>
  <li>Clique sur <strong>Télécharger la note (Excel)</strong>. Au-delà d'une feuille, le fichier contient plusieurs onglets.</li>
</ol>
<p>Pour qu'une prestation apparaisse, la personne doit figurer parmi les <strong>encadrants</strong> de la séance ou du groupe de stage.</p>`,
      },
      {
        id: "admin-license",
        title: "Licence du club",
        body: `
<p>Menu <strong>Licence</strong> : état de l'abonnement du club. Un bandeau prévient quelques jours avant l'échéance.</p>
<ul>
  <li><strong>Activer la licence</strong> / <strong>Renouveler la licence</strong> : paiement par carte sur une page sécurisée ; l'accès est rétabli dès le paiement.</li>
  <li><strong>Gérer mon abonnement</strong> (si le club paie en ligne) : ouvre l'espace de paiement sécurisé pour gérer l'abonnement.</li>
  <li>Règlement par facture ou virement : contacte l'adresse indiquée sur la page.</li>
</ul>
<p>Sans licence valide, seule la page Licence reste accessible, pour tous les utilisateurs du club.</p>`,
      },
    ],
  },
];

// Chapitres visibles pour un utilisateur ayant ces rôles.
export function chaptersForRoles(roles = []) {
  return HELP_CHAPTERS.filter((c) => !c.roles || c.roles.some((r) => roles.includes(r)));
}

// Texte brut d'une section (recherche).
export function sectionText(section) {
  return `${section.title} ${section.body.replace(/<[^>]+>/g, " ")}`;
}
