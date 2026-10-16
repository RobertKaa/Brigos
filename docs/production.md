# Production des constructions

Chaque exemplaire d’une construction réalisée sur plan produit des **pièces de monnaie**, indépendamment des autres exemplaires. Il ne crée aucun Brigo et n’accorde ni XP, ni ouverture de boîte, ni progression quotidienne supplémentaire. Les créations du bac à sable ne produisent pas de monnaie.

## Rendement et temps

- Les petits plans de moins de 50 Brigos produisent toutes les **1 h**. Les plans de 50 à 199 Brigos ont un cycle de **2 h**, ceux de 200 à 899 un cycle de **4 h**, et les monuments de 900 Brigos et plus un cycle de **8 h**. La première récolte demande un seul cycle.
- La cible quotidienne est `min(96, 24 + floor(sqrt(prix de référence du plan) / 5))`. La récolte par cycle est l’entier inférieur de cette cible multipliée par la durée du cycle en jours, avec un minimum de une pièce. Le revenu journalier annoncé est le rendement effectif de ces cycles, entre **24 et 96 pièces par exemplaire**. Le prix de référence reprend les matériaux et tarifs `PART_PRICES` du comptoir, indépendamment des couleurs libres réellement réservées. Les arrondis font que les petits plans actuels ont le même revenu de base ; la rareté distingue davantage les paliers supérieurs. Le moteur et l’interface partagent le même calcul.
- Le stock conserve jusqu’à **72 h**, soit 72 cycles pour un petit plan, 36 pour un plan de 2 h, 18 pour un plan de 4 h et 9 pour un monument. Il n’existe aucune pénalité pour un jour manqué ; au-delà du stock, les cycles excédentaires ne sont pas rattrapés.
- Une récolte conserve la fraction de cycle : récolter un totem après 1 h 30 laisse la prochaine production à 2 h après sa réalisation.
- Chaque exemplaire ajoute son propre rendement et conserve son propre horaire. Une pile de constructions identiques affiche leur production cumulée et permet de les récolter ensemble, en une seule transaction.
- Le démontage récolte automatiquement les pièces mûres avant de restituer les Brigos exacts réservés. Refaire le plan crée un identifiant et un nouveau cycle ; démonter puis refaire immédiatement ne produit rien.

Exemples : un totem produit **1 pièce/h**, deux totems **2 pièces/h**, soit 48 pièces par jour pour la pile. Le phare du port produit **3 pièces/2 h**, soit 36 par jour. Les jardins d’Astréval produisent **21 pièces/8 h**, le palais **27 pièces/8 h** et la citadelle **32 pièces/8 h**, soit 63, 81 et 96 par jour. Les doublons s’additionnent simplement ; les revenus du carnet quotidien restent inchangés. Un totem coûte 100 pièces au comptoir et produit 24 pièces par jour : le raccourcissement du délai conserve un amortissement de plusieurs jours.

## Sauvegarde v10 et intégrité

La sauvegarde v10 conserve `production: { observedAt, entries }`. Chaque entrée est indexée par l’identifiant d’un exemplaire et conserve `anchorAt`, `claimedCycles` et `bankedCoins`. Les compteurs de cycles utilisent la nouvelle durée du plan ; les anciens clients refusent donc la v10. Ces compteurs bornés rendent les récoltes déterministes, sans tirage aléatoire et sans remise à zéro lors d’une visite ou d’un rechargement.

Les v1 à v8 sont migrées en activant les constructions conservées **au moment de la migration**, sans récompense rétroactive. La v9 est validée avec son ancien cycle de 24 h et son ancien barème. Les pièces mûres sont conservées dans `bankedCoins`, à récolter une seule fois. La fraction du cycle en cours est reportée proportionnellement au nouveau cycle, sans recréditer les anciens cycles ni accélérer rétroactivement le temps passé. Plans, réservations, projets libres, album et carnet restent conservés. Les versions anciennes et imports rétrogradés ne doivent pas effacer ces marqueurs.

Le schéma courant exige le champ racine de production. Une entrée absente dans un snapshot technique conservé est initialisée au moment de son observation, sans récompense rétroactive. Le chargement persiste cette normalisation une seule fois sous contrôle de révision ; les rechargements suivants conservent donc l’échéance. `getProduction` reste pur : afficher un compteur ne modifie aucune sauvegarde.

`observedAt` est une borne temporelle persistée. Un recul de l’horloge ne permet pas de rejouer les cycles reçus ; les pièces déjà mûres restent récoltables. Un jeu uniquement local ne peut pas authentifier l’heure de l’appareil ni empêcher la modification volontaire d’un fichier exporté : un service de temps et une validation serveur seront nécessaires si l’économie devient partagée.

La récolte passe par `game.act` et le contrôle de révision IndexedDB existant. Monnaie et marqueurs sont enregistrés ensemble. Une course entre deux onglets ne crédite qu’un lot. Le plafond `MAX_VALUE` est vérifié sur le total demandé : si une pile ou une récolte globale dépasse ce plafond, rien n’est crédité ni marqué. L’utilisateur peut dépenser de la monnaie ou récolter une pile plus petite. Le démontage conserve aussi cette atomicité lorsque la restitution des matériaux dépasserait leur plafond d’inventaire.

## Vérification

`production.test.ts` couvre échéances, rendements, exemplaires multiples, piles, fractions de cycle, stock de trois jours, recul d’horloge, démontage, absence de production libre, plafonds et parsing malveillant. `productionStorage.test.ts` couvre export/import, migration persistée une seule fois, concurrence entre onglets et conservation des réservations.

Pour la revue visuelle, utiliser `scripts/review-production.html` : deux totems, le phare du port et la citadelle ont deux cycles en réserve. `?fresh=1` montre leur premier cycle après 30 secondes, avec un timer inférieur à une heure pour le totem. Les récoltes et démontages utilisent le vrai moteur en mémoire, sans importer App, useGame ou le stockage. Le bouton jour/nuit et les largeurs de 320 et 390 pixels permettent de contrôler cartes, timers, piles et actions tactiles. Ne pas modifier la sauvegarde du joueur pour simuler une récolte.
