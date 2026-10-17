# Brigos

Jeu de collection et de construction, en français, conçu pour desktop et mobile, avec mode invité local et comptes Supabase optionnels. Version 0.9.

## Règle permanente d’originalité

Toute évolution doit respecter les droits de LEGO et éviter la copie de formes, constructions, personnages, notices ou visuels de tiers. Les règles applicables aux futures conversations sont enregistrées dans [AGENTS.md](AGENTS.md), avec les sources officielles et les critères de revue dans [la politique d’originalité](docs/originality-policy.md). Les pièces Brigos utilisent des raccords facettés et une illustration originale ; aucun test ne constitue une certification juridique.

## Démarrer

Node.js 22.12 ou plus récent est nécessaire.

```sh
npm install --legacy-peer-deps
npm run dev
```

Ouvrir http://127.0.0.1:5173/. Le port est fixe pour retrouver la même sauvegarde locale à chaque lancement. Une autre adresse, un autre port ou un autre navigateur possède une partie distincte.

L’option `--legacy-peer-deps` contourne un problème du résolveur npm 10 avec les dépendances optionnelles de Vitest. Le lockfile contient les versions effectivement installées ; pour une installation reproductible, utiliser `npm ci --legacy-peer-deps`.

## Comptes et publication

Le dépôt du projet est [RobertKaa/Brigos](https://github.com/RobertKaa/Brigos). Le workflow GitHub Pages publie la **démo invitée**, sans compte connecté ni paiement, sous `/Brigos/`. Voir [la publication de la démo](docs/github-pages.md). Les sauvegardes locales restent propres à chaque origine : le site public ne reprend pas automatiquement la partie du serveur local.

Les comptes Google et email/mot de passe sont implémentés avec Supabase Auth. Un compte commence une nouvelle partie serveur, séparée de la partie invitée. Les commandes connectées sont validées côté serveur et enregistrées avec révision, reçu unique et journal économique. Une coupure réseau ne crédite jamais de ressources localement. Les commandes admin et l’import JSON restent réservés aux parties locales.

Pour activer les comptes sur un hébergement d’application adapté, copier `.env.example` vers `.env.local`, renseigner uniquement l’URL et la clé publique Supabase, puis configurer les migrations, Google et SMTP selon [le guide Supabase](docs/supabase.md). La clé secrète, le secret Google et la clé SMTP ne vont jamais dans `VITE_*` ou dans le dépôt. Sans configuration, le mode invité reste fonctionnel. Aucun paiement n’est activé dans ce lot.

Le domaine `brigoslab.com` est détenu par le projet. Les emails de compte Resend sont configurés et un essai réel de confirmation et de connexion a réussi ; voir [les emails](docs/email-delivery.md). Cloudflare Pages est retenu pour la version avec comptes, avec déploiement automatique demandé à chaque push sur `main`. `npm run build:cloudflare` construit cette version sans la publier. Voir [la configuration Cloudflare et la bascule DNS](docs/cloudflare.md).

```sh
npm run server:bundle
```

Cette commande prépare le moteur partagé pour le déploiement de la fonction Supabase. Le bundle serveur généré est ignoré par Git et doit être reconstruit avant chaque déploiement. Pour contrôler les formulaires sans compte réel ni sauvegarde, utiliser [l’aperçu des comptes](http://127.0.0.1:5173/scripts/review-account.html).

## Le prototype

- Départ avec 1 200 pièces et 3 boîtes Découverte.
- Navigation directe **Boîtes / Atelier / Libre / Collection / Quêtes**. Comptoir unique de choix et d’ouverture, plans accessibles sans grands blocs promotionnels, assemblage suivi de Mes créations, collection centrée sur les pièces possédées et récompenses de missions récupérables ensemble. Voir [les parcours UI/UX](docs/ux-flows.md) et [l’essai interactif sans sauvegarde](http://127.0.0.1:5173/scripts/review-journeys.html#workshop).
- Identité de carnet manga : papier ivoire, encre, trames, accents corail/citron et cartes imprimées. Mode nuit accessible dans l’en-tête et dans le guide ; préférence mémorisée indépendamment de la partie, suivi de l’appareil par défaut et synchronisation entre onglets. Navigation, ressources et actions adaptées au desktop et au mobile.
- Trois types de boîtes, contenant exactement **dix Brigos par nouvelle ouverture**, aux mêmes prix de 100, 250 et 500 pièces. Les boîtes en réserve sont utilisées avant la monnaie.
- 55 modèles actifs × 10 couleurs = 550 variantes, dessinées en SVG avec traits d’encre et raccords en losange. Roue facettée, essieu, articulation et palier traversant équipent les nouveaux projets mécaniques ; leurs références sont ajoutées à la fin pour conserver tous les numéros historiques. Les trois anciens cônes sont archivés : ils restent dans les sauvegardes et les albums qui les ont découverts, sans apparaître dans les nouveaux tirages. Les plans publiés conservent leurs pièces et placements ; leurs présentations reçoivent des décors originaux par thème, retirés pendant les étapes de montage.
- Cinq raretés : Commun, Peu commun, Rare, Épique et Légendaire. La rareté dépend uniquement du modèle, jamais de sa couleur ; les dix couleurs d’un modèle ont la même probabilité.
- Album avec recherche par forme, dimensions, numéro ou couleur ; filtres de famille, rareté, couleur, possession et doublons ; pagination.
- **72 plans**, dont **sept constructions à mécanismes**, **20 projets intermédiaires** et trois constructions légendaires de 915 à 3 545 Brigos. Charrette, éclaireur, transporteur, bibliothèque itinérante, coffre, passerelle et pupitre utilisent roues, essieux ou articulations dans des assemblages vérifiés. Les grandes briques sont privilégiées pour les structures ; les petites pièces servent aux détails. Voir les [plans mécaniques](docs/mechanical-library.md), la [bibliothèque intermédiaire](docs/intermediate-library.md), la [revue précédente](docs/construction-review.md) et les [grands projets](docs/legendary-constructions.md).
- Bibliothèque organisée par format : petits plans de moins de 50 Brigos, intermédiaires de 50 à 899, légendaires à partir de 900. Recherche par nom de plan ou de pièce utilisée, sans distinction d’accents, filtres de thème et de difficulté, raccourcis vers les plans réalisables et l’objectif suivi, tri par pièces manquantes, quantité ou XP. Les plans et **Mes créations** affichent **12 cartes par page**, avec commandes en haut et en bas, numéros sur desktop et sélecteur sur mobile. Un changement de filtre ou de tri revient à la première page ; la pagination suit les résultats après un changement d’inventaire ou un démontage.
- Les quantités nécessaires sont dérivées des placements et orientations qui produisent aussi le dessin. Les tests vérifient les collisions, les attaches par tenons, la connectivité et l’ordre de montage. Il s’agit d’une validation géométrique, sans simulation de charges mécaniques. Les 65 plans ont été revus sous quatre angles : animaux, sapin, voiliers, piano, cascade et plusieurs bâtiments ont été corrigés. Le [compte rendu de la revue](docs/construction-review.md) indique chaque plan conservé ou modifié.
- Sauvegarde v6 : les créations dont la géométrie ou les matériaux ont changé sont démontées avec restitution exacte de leurs anciens Brigos. Les autres créations, découvertes et récompenses restent conservées. L’XP suit les créations encore exposées et revient après reconstruction. Un changement d’angle de présentation seul conserve la création.
- Sauvegarde v7 : le carnet et les récompenses quotidiennes sont mémorisés dans un format distinct qui protège les gains déjà réclamés contre les anciens onglets. La migration v6 → v7 conserve toutes les créations et ressources ; aucune géométrie ne change.
- Sauvegarde v8 : ajoute les projets libres et leurs Brigos réservés, sans modifier les plans, les créations existantes ni les récompenses du carnet. Les anciens clients ne peuvent pas réécrire une partie dont ils ignoreraient ces réservations.
- Sauvegarde v9 : conserve les compteurs de production de chaque construction. Les anciennes créations commencent à produire à la migration, sans gain rétroactif ; leurs matériaux et leur XP restent inchangés.
- Sauvegarde v10 : remplace les cycles de 24 h par des cycles de 1, 2, 4 ou 8 h selon la taille du plan. La migration v9 conserve les pièces mûres et reporte la fraction du cycle en cours, sans gain rétroactif au nouveau barème.
- Lecteur de montage pièce par pièce, quatre orientations, zoom des grands plans et navigation par lots de 150 pièces. La géométrie et les relations de profondeur sont préparées une fois par vue ; les étapes réutilisent les dessins des grandes constructions. Voir le [contrôle des performances](docs/instruction-performance.md). Chaque plan peut devenir un objectif, visible depuis l’accueil et après les ouvertures.
- L’assemblage réserve les références exactes ; le démontage restitue ces mêmes pièces. L’album conserve les découvertes.
- **Récoltes des constructions** : chaque petit plan rapporte dès la première heure. Les autres plans ont des cycles de 2, 4 ou 8 h, avec des lots plus importants selon la taille et la rareté des matériaux, pour 24 à 96 pièces par jour et par exemplaire. Un totem donne 1 pièce/h, une pile de deux totems 2 pièces/h, une citadelle 32 pièces/8 h. Les exemplaires d’un même plan sont regroupés en une pile cliquable dans Mes créations : leur rendement s’additionne, avec un timer propre à chaque copie et une réserve de trois jours. Récolte globale depuis l’atelier ou le carnet, sans créer de Brigos. Voir [l’économie de production](docs/production.md). L’aperçu interactif [review-production.html](http://127.0.0.1:5173/scripts/review-production.html) teste les récoltes en mémoire sans accéder à la sauvegarde ; ajouter `?fresh=1` pour voir le premier cycle.
- **Bac à sable 3D dans l’atelier** : créations personnelles sur un plateau de 24 × 24, caméra libre en perspective, rotation, déplacement de la vue, zoom et vue du dessus. Un clic bref vise une surface, l’aperçu reste fixé et **Poser ici** confirme dans la scène ; glisser tourne la caméra. Deux doigts déplacent et zooment sur mobile. Empilement automatique, hauteur manuelle, sélection et retrait restent disponibles. Seuls les Brigos en stock peuvent être placés ; chaque geste réserve exactement l’exemplaire choisi, et son retrait le restitue. Jusqu’à 20 projets de 500 pièces, sans XP ni gain de monnaie. Le moteur 3D est chargé à la demande, avec rendu au besoin et vue de secours si WebGL est indisponible. Voir [les règles du bac à sable](docs/sandbox.md).
- Niveau de bâtisseur calculé à partir des créations actuellement assemblées et trois défis récompensés. L’onglet **Quêtes** rassemble les activités gratuites : cadeau quotidien, circuit à résoudre, trois missions et passeport de visites.
- Comptoir pour commander les pièces manquantes d’un plan avec la monnaie du jeu, et recyclage des doublons disponibles pour financer de nouvelles idées.
- Sauvegarde IndexedDB après chaque action. Les écritures sont atomiques et contrôlées par révision pour éviter d’écraser les actions d’un autre onglet. BroadcastChannel actualise les autres vues.
- Une ouverture déjà créditée est restaurée après rechargement sans générer de nouveau butin. Les anciennes boîtes de **cinq** cartes conservent leurs cinq résultats ; elles ne sont jamais complétées ni recréditées. Le même historique peut contenir des ouvertures de cinq et de dix.
- Coffre animé en 3D CSS, puis cartes à retourner : halo de rareté visible avant révélation, cinq couleurs et symboles, cadres imprimés, éclat des trouvailles et récapitulatif final. Révélation au choix carte par carte, en cascade avec **Une à une**, ou immédiatement avec **Tout révéler**. L’animation du coffre peut être passée ; les animations réduites suppriment les rotations et pulsations.
- Enchaînement des boîtes dans une même modale, sélection du type suivant, coût et stock visibles. La grille de cartes et les commandes s’adaptent à la largeur de l’écran.
- Confettis PixiJS chargés à la demande, option de réduction des animations et son optionnel. Les polices sont embarquées pour fonctionner sans service externe.

## Progression et rendez-vous Brigos

L’XP totale est la somme de l’XP des créations actuellement exposées. Chaque exemplaire assemblé apporte la base de sa difficulté, plus **2 XP par pièce**.

| Difficulté   | XP de base |
| ------------ | ---------: |
| Premiers pas |         30 |
| Créatif      |         90 |
| Expert       |        200 |
| Légendaire   |      1 000 |

Le seuil du niveau `N` vaut `50 × (N − 1) × N` XP : les niveaux 1 à 5 commencent à 0, 100, 300, 600 et 1 000 XP. Démonter une création retire toute son XP et peut faire redescendre le niveau. La reconstruire restitue cette même XP, sans gain permanent supplémentaire. Les créations déjà assemblées avant la version 0.3 apportent automatiquement leur XP.

Le cadeau Brigos contient **100 pièces de monnaie et 1 boîte Découverte**. Le premier cadeau est disponible immédiatement ; les suivants se renouvellent au changement de jour UTC (heure locale affichée dans le carnet), sans délai glissant de 24 heures ni série à maintenir.

Le **Circuit des facettes** est un casse-tête de 16 tuiles à tourner pour relier une entrée à une sortie. Un circuit déterministe différent chaque jour, un indice gratuit et des essais illimités ; sa première résolution récompensée rapporte **150 pièces**. Les trois missions quotidiennes offrent **50 pièces** pour récupérer son cadeau, **100** pour ouvrir deux boîtes offertes ou achetées, **50** pour réussir le circuit, puis **100** de bonus après récupération des trois récompenses. Cela représente **550 pièces brutes et une boîte Découverte par jour**. Depuis zéro, la seconde Découverte coûte 100 pièces : le parcours complet laisse **450 pièces nettes et 20 Brigos**, sans recycler sa collection. Tous les sept cadeaux récupérés, même sur des jours espacés, le passeport offre **300 pièces et une boîte Prisme**, puis recommence. Aucun tampon n’est retiré pendant une absence. Voir [les règles et le budget du carnet](docs/daily-journal.md).

Trois défis offrent chacun une récompense unique :

- **Collectionneur d’idées** : exposer trois plans différents en même temps, pour 150 pièces de monnaie.
- **Maître d’œuvre** : exposer une construction Expert ou Légendaire, pour 1 boîte Atelier.
- **Grande exposition** : réunir au moins 100 Brigos dans ses créations exposées, pour 1 boîte Prisme.

Les récompenses sont à récupérer dans l’interface. Une fois reçues, elles restent acquises après le démontage des créations et ne peuvent pas être réclamées une seconde fois.

## Comptoir et recyclage

La fiche d’un plan incomplet propose un devis pour ses seules pièces manquantes. La commande débite la monnaie et ajoute les références nécessaires à l’inventaire ; les pièces déjà disponibles sont prises en compte. Le recyclage depuis la fiche d’une pièce transforme ses exemplaires disponibles en monnaie, en conservant toujours au moins un exemplaire de cette référence dans l’inventaire ou dans les créations. Les pièces réservées par une construction ne sont jamais recyclées.

| Rareté     | Prix au comptoir par pièce | Monnaie reçue par pièce recyclée |
| ---------- | -------------------------: | ------------------------------: |
| Commun     |                         20 |                               8 |
| Peu commun |                         35 |                              14 |
| Rare       |                         65 |                              25 |
| Épique     |                        140 |                              50 |
| Légendaire |                        300 |                             100 |

Les découvertes restent dans l’album après un recyclage. Achat, recyclage et récompenses passent par les mêmes transactions de sauvegarde que les ouvertures et constructions.

## Commandes admin

Le bouton **Admin** est visible uniquement dans la partie invitée avec `npm run dev`, sur `localhost`, `127.0.0.1` ou `[::1]`. Il reste absent sur une adresse du réseau local et dans tous les builds de production, y compris en prévisualisation locale.

| Onglet     | Commandes                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ressources | Ajouter de la monnaie, des boîtes, une référence précise, tout le catalogue, ou uniquement les pièces manquantes d’un plan.                                             |
| Tirages    | Forcer les dix Brigos d’une seule prochaine boîte à une rareté ; modifier les probabilités de chaque boîte ; rétablir les taux ; consulter les 30 dernières ouvertures. |
| Sauvegarde | Exporter la partie en JSON, importer une sauvegarde validée après confirmation, réinitialiser après avoir écrit `EFFACER`.                                              |

Les fiches des pièces proposent aussi l’ajout d’un exemplaire. Les plans incomplets proposent une commande pour ajouter leurs pièces manquantes.

Le tirage forcé est signalé pendant la révélation et conservé dans l’historique de sauvegarde. Le réglage revient à la normale après une ouverture ; il consomme normalement une boîte ou de la monnaie.

## Probabilités initiales

| Boîte      | Prix | Commun | Peu commun | Rare | Épique | Légendaire |
| ---------- | ---: | -----: | ---------: | ---: | -----: | ---------: |
| Découverte |  100 |   58 % |       26 % | 11 % |    4 % |        1 % |
| Atelier    |  250 |   30 % |       36 % | 22 % |   10 % |        2 % |
| Prisme     |  500 |   10 % |       30 % | 35 % |   20 % |        5 % |

Chaque pièce est tirée indépendamment. Une rareté est sélectionnée selon ces poids, puis une référence uniformément parmi cette rareté. Aucune rareté n’est garantie par boîte. Les tirages utilisent Web Crypto ; les doublons sont possibles et utiles aux constructions.

## Vérification

```sh
npm test
npm run check
npm run build
npm run preview
```

Les tests Vitest couvrent le catalogue actif et ses archives, la géométrie des petits et grands plans dans les quatre vues, les frontières des probabilités, les ouvertures et les doublons, les commandes admin, la conservation des pièces pendant les constructions, la recherche, la progression et la perte d’XP au démontage, les récompenses à usage unique et leur délai, les commandes au comptoir, le recyclage protégé, la validation des imports et la persistance concurrente IndexedDB. Les tests ne modifient pas la partie du navigateur.

Le format de sauvegarde v10 (`planRevision: 1`) accepte les parties v1 à v9. Les constructions sont validées avec leurs exigences historiques, dont l’instantané complet des 65 plans v5. Les créations v1, ainsi que les plans corrigés ou retirés des versions suivantes, sont démontés avec restitution de leurs références exactes ; les montages inchangés restent assemblés. L’XP suit les seules créations encore assemblées. Découvertes, monnaie, boîtes, historique, ouverture en cours, cônes archivés et récompenses déjà obtenues sont conservés. Les étapes v7, v8 et v9 préservent respectivement les récompenses quotidiennes, les réservations libres et les compteurs de production ; la v10 adapte la cadence sans perdre les gains antérieurs. La migration est persistée atomiquement dès le chargement et ne rembourse jamais deux fois les mêmes pièces. Voir [les règles de migration](docs/save-migrations.md) avant toute future modification d’un plan publié.

Pour exporter les planches SVG des 65 constructions sous quatre angles :

```sh
node scripts/render-plan-audit.mjs audit
```

Les résultats sont écrits dans `.artifacts/audit/`. Si `sharp` est déjà installé, le script génère aussi des PNG ; `BRIGO_SHARP_PATH` permet de désigner ce module facultatif. Pour agrandir seulement certains plans, ajouter leurs identifiants : `node scripts/render-plan-audit.mjs legends astreval-gardens aurora-palace high-citadel`.

L’aperçu de développement [scripts/review-opening.html](http://127.0.0.1:5173/scripts/review-opening.html), accessible sur le serveur Vite existant, affiche la vraie modale avec des cartes déterministes et des compteurs fictifs. Il n’accède à aucune sauvegarde et n’écrit rien dans la partie. Son menu permet de vérifier les boîtes de dix, les anciennes ouvertures de cinq et les animations réduites ; la variante `?count=5&box=prism&motion=reduced` ouvre directement un exemple ancien sans animation. Ajouter `&theme=dark` pour vérifier le mode nuit. Cet aperçu reste hors de l’entrée et du build de production.

Le contrôle [scripts/review-chest.html](http://127.0.0.1:5173/scripts/review-chest.html) affiche le vrai coffre avec un curseur de 0 à 2 800 ms et une lecture normale. Il permet de vérifier les raccords et la charnière sur les trois boîtes, image par image et aux différentes largeurs, sans ouvrir de boîte ni accéder à la sauvegarde. Il est réservé au développement et absent du build de production.

L’aperçu [scripts/review-studio.html](http://127.0.0.1:5173/scripts/review-studio.html) permet aussi de consulter l’accueil, la collection, l’atelier et les modales avec une partie fictive. Les actions de jeu y sont neutralisées. Le bandeau mesure le temps de rendu React du plan ouvert, sans ajouter de mesure au jeu de production. Le paramètre `?gallery=25#workshop` fournit une galerie de 25 créations pour vérifier sa pagination, sans toucher à la partie. Voir le [contrôle de la refonte v0.6](docs/interface-v06.md) et celui de la [bibliothèque v0.7](docs/intermediate-library.md).

Pour vérifier le parcours complet dans une partie de test isolée : ouvrir une boîte, révéler les dix pièces individuellement, en cascade ou immédiatement, ouvrir la suivante sans fermer la modale, afficher la collection, suivre un plan, parcourir ses étapes et tourner la vue, commander ses pièces manquantes, l’assembler puis le démonter en vérifiant le retrait de son XP. Tester aussi le cadeau Brigos, un défi récompensé, le recyclage d’un doublon et la protection du dernier exemplaire. Vérifier un tirage forcé, un total de probabilités différent de 100 %, un rechargement pendant la révélation, la reprise d’une ancienne boîte de cinq et les vues à 390 et 320 pixels de large. Un profil de navigateur dédié ou une origine différente isole cette partie de test.

## Limites et sécurité

Cette version possède un panneau de test **local de développement**, sans authentification personnelle. Il exige simultanément le serveur de développement, une adresse de boucle locale (`localhost`, `127.0.0.1` ou `[::1]`) et une partie invitée. Toute personne ayant accès à cette session locale peut l'utiliser. Aucun paramètre d'environnement ne permet de l'activer dans un build de production. Les comptes connectés ne proposent ni commandes admin ni import de sauvegarde, et l'API refuse ces commandes même si une requête est fabriquée manuellement.

Les sauvegardes et l’horloge du mode invité restent modifiables par leur propriétaire ; ses délais ne protègent pas contre la triche. Ce mode ne rejoint jamais l’économie connectée. Pour les comptes, les tirages, soldes, inventaires, récompenses et réservations sont contrôlés par le serveur. Les écritures économiques directes depuis le navigateur sont interdites ; le commit atomique protège aussi contre les commandes répétées et les actions concurrentes. La configuration réelle Supabase, la restauration et les parcours Google/email doivent être vérifiés sur un projet de test avant ouverture publique des comptes.

Les fichiers importés sont limités à 3 Mo et reconstruits à partir d’un schéma connu : identifiants, quantités, découvertes, recettes, probabilités, ouvertures en cours, défis réclamés, activités quotidiennes et projets libres sont validés. Les propriétés étrangères sont ignorées et les références inconnues refusées. L’XP est recalculée à partir des plans assemblés, sans accepter une valeur d’XP importée. Aucun HTML importé n’est exécuté.

La progression est propre à cet appareil et à cette origine web. Effacer les données du navigateur peut la supprimer ; l’export JSON permet de conserver une copie. Si la sauvegarde est inaccessible ou corrompue, le jeu préserve les données existantes et passe dans une session temporaire clairement signalée.

## Structure

- `src/game/catalog.ts` : modèles, couleurs, raretés, boîtes et recettes.
- `src/game/assemblies.ts`, `assemblies/`, `assemblyValidation.ts` et `geometry.ts` : plans par thème, placements, rotations, géométrie et validation des montages.
- `src/game/engine.ts` : règles pures, tirages, construction et commandes admin.
- `src/game/progression.ts` : XP des créations actuelles, niveaux, défis et cadeau Brigos.
- `src/game/market.ts` et `recycling.ts` : devis des pièces manquantes, commandes et recyclage des doublons.
- `src/game/production.ts` et `src/components/ProductionPanel.tsx` : rendement quotidien modéré, réserves par exemplaire et récoltes atomiques par pile.
- `src/game/save.ts`, `legacyRecipes.ts` et `v3RecipeSnapshots.ts` : validation stricte des sauvegardes et instantanés historiques pour migrer les anciens plans.
- `src/game/storage.ts` et `useGame.ts` : IndexedDB, transactions et synchronisation.
- `src/screens/` : boîtes, collection, atelier et administration.
- `src/screens/workshopLibrary.ts` et `WorkshopPagination.tsx` : formats, recherche, tri et pagination des plans et des créations.
- `src/components/BrigoArt.tsx` et `BrigoScene.tsx` : dessin paramétrable des Brigos et scènes isométriques des plans.
- `src/components/PlayerProgress.tsx` : niveau, progression, rendez-vous Brigos et défis.
- `src/components/OpeningModal.tsx`, `OpeningChest.tsx` et `openingSession.ts` : présentation du coffre, révélation des cartes et session visuelle indépendante du crédit des pièces.
- `src/components/PixiSparkles.tsx` : effet d’ouverture optionnel, chargé à la demande.
- `src/studio-theme.css` : identité carnet manga, palettes jour/nuit et adaptations desktop/mobile.
- `src/theme.ts` et `useTheme.ts` : thème jour/nuit/système, validation et persistance de la préférence d’apparence.
- `src/components/CardBackArt.tsx` et `brigo-card.css` : motif original du dos des cartes et cadres de collection.
- `scripts/review-opening.html` et `review-opening.tsx` : aperçu visuel de développement sans accès aux sauvegardes.

React + TypeScript + Vite pour l’interface ; Three.js pour le bac à sable 3D ; PixiJS pour les effets ; IndexedDB via `idb` pour la sauvegarde ; Vitest et `fake-indexeddb` pour les tests.
