# Versions des plans et sauvegardes

## Bac à sable / sauvegarde v8

La v8 ajoute les projets libres et leurs placements exacts. Les sauvegardes antérieures reçoivent une liste vide ; leurs ressources, plans assemblés, récompenses, activités et pièces restent identiques. Le format 8 exige ce champ et protège les réservations contre les anciennes applications qui ignoreraient les projets libres. La révision IndexedDB refuse également une écriture obsolète depuis un autre onglet.

Un Brigo placé est retiré de l’inventaire disponible. Le retrait d’un placement ou le démontage du projet restitue exactement sa référence et sa couleur ; un déplacement ne modifie jamais la quantité. Les validations portent sur les références découvertes, noms, identifiants, rotations, positions, chevauchements et limites de projets/pièces. La limite d’import passe à 3 Mo pour accueillir les projets bornés, sans changer la structure des constructions sur plan. Voir [docs/sandbox.md](sandbox.md).

## Carnet quotidien / sauvegarde v7

La v7 ajoute seulement l’état des activités quotidiennes et du passeport. Les plans v6, les pièces réservées, l’XP, la monnaie et les récompenses existantes sont conservés à l’identique. Une sauvegarde v6 est chargée puis persistée en v7 dans la même transaction de migration ; les formats v1 à v5 suivent encore leur chemin historique avant cette mise à niveau.

Un lecteur antérieur refuse la version 7 et ne peut donc pas retirer les marqueurs de récompenses en réécrivant la partie. Les écritures d’un ancien onglet restent refusées par la révision IndexedDB. La v7 exige un carnet valide et borné ; un champ manquant n’est accepté que pour les anciens formats. Les imports remplacent leur propre état d’activité sans transformer leur historique en ouvertures du jour. Le cadeau utilise maintenant une journée UTC, dont l’heure de renouvellement locale est affichée. Voir [les règles du carnet](daily-journal.md).

Les constructions réservent les références exactes du joueur. L’XP est calculée
à partir des constructions encore assemblées ; une migration qui démonte un
ancien plan restitue ses pièces et retire naturellement sa contribution à l’XP.
Les cadeaux, défis déjà réclamés, monnaies, boîtes, découvertes et ouvertures ne
sont pas rejoués.

## Avant chaque modification des plans publiés

1. **Avant d’éditer les plans**, figer leurs exigences et leur géométrie dans un
   module de données historique indépendant du catalogue actif. Ne jamais
   régénérer un ancien instantané après les retouches.
2. Créer une nouvelle version du schéma de sauvegarde et/ou une nouvelle
   `planRevision`, puis conserver les instantanés et validateurs des versions
   précédentes. Une simple hausse de `planRevision` sans instantané ni chemin
   de migration compatible ne suffit pas.
3. Valider chaque ancienne construction contre sa nomenclature historique,
   avant toute restitution. Une construction inchangée reste assemblée ; un
   plan retiré ou dont la géométrie ou les matériaux changent est démonté.
   Restituer les références réellement réservées, jamais une nouvelle liste
   calculée depuis le plan courant.
4. Remettre à `null` un objectif visant un plan retiré. Les changements de nom,
   description, clé de placement ou ordre d’instruction seuls ne justifient pas
   de démonter une création.
5. Tester les sauvegardes avant/après, l’idempotence, les entrées corrompues,
   les limites d’inventaire et les chargements simultanés dans deux onglets.
6. Activer le nouveau schéma seulement quand les plans sont finalisés et les
   tests réussis. Lorsque le serveur doit rester ouvert, travailler dans une
   copie isolée. Installer d’abord les instantanés et le commutateur de version,
   conserver l’ancien catalogue pendant l’intégration, puis activer en une seule
   fois la nouvelle géométrie et son format de sauvegarde. Le HMR ne doit jamais
   persister une bibliothèque de travail sous la version déjà publiée.

## Migration vers la v4

- La v1 est validée avec `LEGACY_REQUIREMENTS`, puis ses créations sont
  démontées pour corriger les premiers dessins incompatibles.
- La v2 possède quatorze plans. Son ancien sapin utilise
  `V2_TREE_REQUIREMENTS` ; les autres plans ont la nomenclature de leur
  instantané v3.
- Les trente-sept plans de la v3 sont figés dans `v3RecipeSnapshots.ts`. Les
  signatures géométriques comparent modèle, couleur, position et rotation ;
  elles ignorent les clés et l’ordre des étapes. La comparaison des matériaux
  ignore leurs libellés et leur ordre.
- La v4 finale comporte `planRevision: 1`. Une brève version de développement
  v4 sans marqueur est strictement interprétée comme un instantané v3. Les
  plans inconnus de la v3 et toute révision non prise en charge sont rejetés.
- Le chargement IndexedDB valide et persiste la migration dans une transaction
  avec augmentation de révision. Un second onglet reçoit la version déjà
  migrée ; il ne restitue pas une seconde fois les mêmes pièces. Toute écriture
  obsolète est refusée.
- Si la sauvegarde est invalide ou si une restitution dépasserait les limites
  d’inventaire, la version d’origine est conservée sans écriture partielle.

`parseSave` reste pur : l’import JSON n’écrit pas dans IndexedDB et ne modifie
pas l’objet fourni. Le fichier importé était limité à 1 Mo avant la v8 et l’est désormais à 3 Mo ; seules les
propriétés reconnues du schéma sont réutilisées.

## Migration vers la v5

- Les quarante-deux plans publiés en v4 / `planRevision: 1` sont figés dans
  `v4RecipeSnapshots.ts`, avec leurs 789 placements et nomenclatures exactes.
  Les sauvegardes v4 marquées sont validées contre cet instantané, même si
  les plans actifs changent. La compatibilité v1, v2, v3 et v4 sans marqueur
  continue d’utiliser les données historiques indiquées plus haut.
- La v5 conserve `planRevision: 1`. Cette version n’accepte pas de marqueur
  absent : elle est activée une fois les nouveaux plans finalisés.
- L’ancien sapin à trois cônes peut être démonté par la migration. Ses cônes
  sont restitués à l’identique ; ils restent des références valides du
  catalogue, de l’album, des inventaires et des ouvertures existantes. Ils ne
  sont jamais convertis automatiquement en d’autres pièces. Les modèles
  archivés restent dans `CATALOG` / `BRIGO_BY_ID`, même s’ils sont exclus de
  `ACTIVE_CATALOG` et des futurs tirages. La validation des matériaux
  historiques doit continuer à pouvoir les allouer.
- Les nouveaux plans de plusieurs milliers de pièces utilisent la même
  représentation agrégée des références réservées. Le nombre de pièces d’une
  création ne doit pas être confondu avec la limite de mille créations dans
  l’atelier. Le chargement vérifie la nomenclature complète et le démontage
  restitue toutes les quantités.
- Les mêmes protections transactionnelles, de conservation des récompenses,
  d’idempotence et de dépassement de capacité s’appliquent à cette migration.

## Boîtes de dix Brigos

- Les nouvelles ouvertures utilisent `BOX_DROP_COUNT = 10`. La version de
  sauvegarde reste **v5 / `planRevision: 1`** : la structure des ouvertures et
  les plans publiés ne changent pas.
- Une ouverture déjà enregistrée conserve exactement ses cinq ou dix cartes.
  L’import et la reprise ne complètent jamais une ancienne boîte et ne
  créditent aucun Brigo supplémentaire. Le parseur n’accepte que ces deux
  tailles, contrôle chaque référence et chaque booléen, puis vérifie que
  l’ouverture en cours correspond exactement à son entrée d’historique.
- L’historique peut mélanger des boîtes de cinq et de dix. Une ancienne
  ouverture en cours peut être terminée normalement, puis suivie d’une
  nouvelle boîte de dix dans une seule transaction.
- Le coût et le stock restent calculés **par boîte**. Un échec au dixième
  tirage ou un dépassement de capacité annule l’ensemble de l’ouverture,
  sans dépense, sans consommation de stock et sans perdre la précédente.
- Les révisions IndexedDB continuent de bloquer deux ouvertures concurrentes
  depuis deux onglets : une seule écrit ses dix résultats. Aucun changement
  de base de données, remboursement de construction ou redémarrage du
  serveur n’est nécessaire pour ce changement.

## Extension de la bibliothèque en v0.7

- Les vingt plans intermédiaires sont de nouveaux identifiants. Aucun des
  quarante-cinq plans publiés en v0.6 ne change de géométrie, de nomenclature,
  de difficulté ou d’ordre dans le catalogue.
- La sauvegarde reste **v5 / `planRevision: 1`**. Les créations existantes
  restent assemblées, avec leurs références réservées et leur XP ; aucun
  remboursement ni démontage automatique n’est nécessaire.
- `fixtures/published-v06-digests.json`, figé avant les ajouts, conserve les
  empreintes SHA-256 des géométries et des matériaux précédents. Les tests
  contrôlent ces empreintes et le rechargement d’une galerie des 45 plans.
  Cet instantané ne doit pas être régénéré pour faire passer une modification
  ultérieure d’un plan publié.

## Revue complète en v0.8 / sauvegarde v6

- `v5RecipeSnapshots.ts` et ses données compactes figent les 65 recettes et
  13 643 placements publiés en v5 avant toute correction. Des empreintes SHA-256
  complètes et indépendantes de géométrie/matériaux en contrôlent l’intégrité.
  Cet instantané ne doit pas être régénéré depuis la v6.
- Les créations v5 sont d’abord validées contre ces exigences historiques.
  Une différence de géométrie ou de matériaux entraîne le démontage et la
  restitution exacte des références réservées. Les créations inchangées restent
  exposées. Les autres données de jeu restent conservées.
- L’angle `previewRotation` agit uniquement sur la caméra : il ne modifie ni
  les placements, ni les pièces, ni les signatures de migration. Un changement
  de caméra seul ne retire donc aucune XP.
- `CURRENT_SAVE_VERSION` active ensemble les plans corrigés et la sauvegarde
  v6. À la valeur 5, le catalogue utilise exclusivement les recettes v5 figées
  et refuse les imports v6 ; à la valeur 6, la migration est disponible.
- Les actions attendent le chargement de la version active. Une opération
  async d’un ancien chargement ne réapplique pas un état obsolète après
  activation. Les révisions IndexedDB protègent toujours les actions et la
  migration contre une écriture concurrente.
- Les limites d’inventaire, les références inconnues, les créations historiques
  incomplètes et les formats futurs restent rejetés. Aucune écriture partielle
  n’est faite en cas d’échec ; un second chargement ne restitue rien de plus.
- Les sauvegardes historiques v1 à v4 continuent d’utiliser leurs seuls
  instantanés : elles ne peuvent pas introduire un identifiant apparu en
  v0.7. Les nouveaux montages sont testés en v5 jusqu’au démontage, avec
  restitution des quantités exactes et retrait de leur XP.
- Recherche, filtres, tri et pagination restent des états d’interface.
  Ils n’écrivent pas dans la partie et ne changent pas la progression.

## Production des constructions / sauvegarde v9

- La v9 ajoute les compteurs `production` par exemplaire (`anchorAt`,
  `claimedCycles`) et la dernière heure observée. Les formats v1 à v8
  activent leurs créations conservées au moment de la migration : aucune
  production passée n’est créditée. Aucun placement, matériau ou calcul
  d’XP ne change pour cette évolution.
- Monnaie récoltée et compteurs sont sauvegardés ensemble, sous contrôle
  de révision IndexedDB. Une course entre deux onglets ne donne qu’un lot.
- Les imports v9 exigent le champ de production. Un ancien format qui
  contient un registre v9 non vide est refusé pour préserver les récoltes
  déjà reçues. Les anciens clients refusent la v9.
- Voir [les règles de production](production.md) pour les échéances,
  limites, piles d’exemplaires et invariants de démontage.

## Cycles de récolte courts / sauvegarde v10

- La v10 donne aux compteurs de cycles la nouvelle durée du plan : 1, 2, 4 ou
  8 h selon sa taille. Les anciens clients doivent refuser cette sauvegarde.
- Une v9 est d’abord validée avec sa règle historique de 24 h et son ancien
  revenu. Sa réserve mûre est conservée dans `bankedCoins`, sans créditer le
  nouveau barème sur le temps passé. La fraction de journée est reportée
  proportionnellement au nouveau cycle ; les cycles déjà réclamés ne sont
  jamais rejoués.
- La borne d’horloge reste conservée. La migration et les nouvelles ancres
  sont persistées ensemble sous contrôle de révision, une seule fois, y
  compris si deux onglets chargent simultanément la partie.
- Les créations, leurs Brigos réservés, l’XP et les activités du carnet ne
  changent pas. Les formats antérieurs à la production commencent leurs
  cycles au moment de leur migration.
