# Carnet quotidien et économie gratuite

Le carnet propose une activité jouable même quand la réserve du joueur est vide. Les récompenses sont fixes, visibles avant de jouer et réclamées explicitement. Les jours manqués ne retirent ni monnaie ni tampons de passeport. Aucune récompense n’exige une série de jours consécutifs.

## Récompenses et parcours gratuit

| Activité                            | Récompense                      | Fréquence                      |
| ----------------------------------- | ------------------------------- | ------------------------------ |
| Cadeau d’atelier                    | 100 pièces + 1 boîte Découverte | Une fois par jour UTC          |
| Mission du cadeau                   | 50 pièces                       | Une fois par jour UTC          |
| Circuit du jour                     | 150 pièces                      | Une fois par jour UTC          |
| Mission du circuit                  | 50 pièces                       | Une fois par jour UTC          |
| Mission : ouvrir deux boîtes        | 100 pièces                      | Une fois par jour UTC          |
| Bonus : réclamer les trois missions | 100 pièces                      | Une fois par jour UTC          |
| Passeport : sept visites            | 300 pièces + 1 boîte Prisme     | À chaque cycle de sept visites |

Le total quotidien est **550 pièces et une boîte Découverte**. `DAILY_COIN_BUDGET` additionne les configurations de récompenses pour éviter un chiffre marketing désynchronisé du moteur.

Un joueur partant de **zéro pièce et zéro boîte** peut récupérer le cadeau, résoudre le circuit, puis ouvrir la boîte offerte et acheter une seconde Découverte à 100 pièces. Une fois toutes les récompenses réclamées, il possède **450 pièces nettes et 20 Brigos**, issus des deux boîtes de dix cartes. Les 550 pièces désignent donc les gains bruts ; les ouvertures ne sont pas toutes gratuites. Les tirages gardent les probabilités existantes et ne garantissent aucune rareté.

Le passeport avance lorsque le cadeau du jour est réclamé. Il compte au plus un tampon par jour, conserve les visites non consécutives et reste disponible à sept tampons jusqu’à récupération. La récompense remet les tampons à zéro et augmente le numéro de cycle. Elle peut être gagnée à nouveau après sept nouvelles visites. Le jour de la récupération ne donne pas un second tampon. Un modèle monté puis démonté ne rapporte aucune monnaie de carnet.

## Parcours des quêtes

La destination « Quêtes » affiche d’abord le cadeau du jour, puis les trois missions aux intitulés explicites. La progression compte les pièces brutes déjà reçues sur les 550 pièces quotidiennes, indépendamment des achats effectués ensuite. Après le cadeau, un lien mène directement aux boîtes. Le circuit et le passeport sont repliables ; leurs récompenses et leur état restent lisibles dans leur résumé. La récolte des constructions est accessible par un lien vers les créations de l’atelier.

« Tout récupérer » compose `claimDailyMission` pour les missions prêtes dans une seule transformation de `game.act`. Le bonus est évalué après les trois missions et inclus si celles-ci viennent de le débloquer. Les montants, marqueurs et validations du moteur restent inchangés. Une réserve insuffisante refuse la transformation entière sans crédit partiel ; les boutons individuels restent disponibles pour recevoir une récompense qui tient dans la réserve. Le simple affichage et l’ouverture des sections n’attribuent rien.

## Jour civil UTC

Toutes les activités utilisent la même date UTC, du début de journée à minuit UTC suivant. Le cadeau historique passait auparavant par un délai glissant de 24 heures ; il se renouvelle maintenant à la même frontière que les missions et le circuit. L’interface doit indiquer cette référence, car minuit UTC n’est pas minuit dans chaque fuseau local.

Le timestamp historique `lastVisitRewardAt` est conservé exactement lors du chargement. Un cadeau déjà pris pendant la journée courante remplit la mission de visite et donne un seul tampon initial, sans recréditer sa monnaie ni sa boîte. Les anciens jours ne deviennent pas une réserve de cadeaux ou de tampons rétroactifs.

## Contrat technique

`src/game/engagement.ts` expose :

- `getEngagement(state, nowMs)` : date effective, prochain minuit en millisecondes UTC, état d’horloge, missions, circuit et passeport ; lecture pure.
- `claimDailyMission(state, id, nowMs)` : récupération de `visit`, `open-boxes`, `puzzle` ou `day-complete`.
- `claimDailyPuzzle(state, rotations, nowMs)` : vérification du circuit par `isDailyPuzzleSolved` puis versement des 150 pièces.
- `claimPassportReward(state, nowMs)` : récupération des sept tampons.
- `syncEngagement(current, previous, nowMs)` : observation des actions réussies ; plafonne les ouvertures à deux, exclut les tirages admin à rareté forcée et ne verse aucune récompense.
- `initialEngagement(lastVisitRewardAt?, nowMs?)` et `parseEngagement(...)` : création et validation des données de carnet.

`GameState.engagement` est optionnel au niveau du type pour supporter les anciens snapshots React. `createGame()` et `parseSave()` le fournissent systématiquement. Le format passe de **v6 à v7 pour ces seules métadonnées**, afin qu’un ancien client refuse de réécrire une sauvegarde dont il ignorerait les récompenses déjà réclamées. En v7, un carnet absent est refusé ; les anciennes versions restent migrables avec leur état initial. La révision des plans et les identifiants de stockage ne changent pas. Les constructions, placements et matériaux de v6 ne sont ni modifiés ni remboursés par cette migration.

`useGame.act` effectue la transformation, synchronise le carnet, valide le nouvel état, puis le sauvegarde dans la transaction existante avec sa protection de révision. L’import utilise son option `{ observeEngagement: false }` pour conserver le carnet importé sans traiter l’historique comme des ouvertures actuelles. L’observateur exige par ailleurs une nouvelle ouverture du jour dans `pendingOpening`, un compteur augmenté d’une seule unité et un historique cohérent. Une erreur de sauvegarde ou une réserve pleine n’entame pas une récompense. Les boutons ne remplacent jamais les validations du moteur : missions incomplètes, doublons, solution incorrecte, dates invalides et dépassements des réserves sont refusés.

## Limites et garde-fous

La sauvegarde conserve seulement la journée active, quatre identifiants de missions au maximum et un petit état de passeport. Les entrées, dates et compteurs sont strictement bornés. Une horloge revenue avant une journée déjà jouée bloque les nouveaux gains jusqu’au retour à la date attendue. Le simple affichage ne donne aucune récompense et les journées absentes ne s’accumulent pas.

Le jeu fonctionne localement : ces garde-fous protègent les parcours normaux, les doublons et les sauvegardes incohérentes. Ils ne constituent pas une protection serveur contre la modification volontaire de la sauvegarde ou une horloge avancée manuellement. Un compte et une économie partagés nécessiteraient des validations côté serveur.

Les tests couvrent notamment le parcours depuis zéro, les doublons, les plafonds, les tampons non consécutifs, les minuits UTC, le recul d’horloge, les imports historiques et l’absence de gains par montage/démontage.

## Vérification de la livraison

Les 40 fichiers de tests passent, soit 1 310 tests ; TypeScript et build de production validés, audit npm sans vulnérabilité signalée. Le build conserve son avertissement de taille des chunks existants.

Le parcours depuis zéro a également été joué dans `scripts/review-journal.html`, une fixture interactive en mémoire qui ne lit ni n’écrit la partie du joueur : cadeau, deux ouvertures, résolution du circuit et récupération des quatre récompenses aboutissent bien à 450 pièces. La navigation réelle vers `#journal`, les thèmes clair/sombre et le clavier ont été vérifiés. À 390 px, les quatre liens de navigation gardent une hauteur de 56 px, les tuiles mesurent environ 59 px et aucun débordement horizontal n’est présent.
