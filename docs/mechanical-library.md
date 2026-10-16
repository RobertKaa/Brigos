# Constructions à mécanismes

La bibliothèque compte désormais **72 plans**. Les sept ajouts utilisent les
roues, essieux et articulations Brigo dans des assemblages originaux, conçus
indépendamment sans reproduction de set, notice, photographie ou création de
tiers. Les anciennes recettes restent inchangées.

| Plan                       | Brigos | Mécanismes                                     | Difficulté |
| -------------------------- | -----: | ---------------------------------------------- | ---------- |
| La charrette des pousses   |     15 | 2 roues, 1 essieu, 1 palier                    | Créatif    |
| L’éclaireur des dunes      |     30 | 4 roues, 2 essieux, 2 paliers, 1 articulation  | Créatif    |
| Le transporteur des éclats |     46 | 6 roues, 3 essieux, 3 paliers, 2 articulations | Expert     |
| La bibliothèque itinérante |     53 | 4 roues, 2 essieux, 2 paliers, 2 articulations | Expert     |
| Le coffre des cartographes |     31 | 2 articulations                                | Créatif    |
| La passerelle du canal     |     35 | 2 articulations                                | Créatif    |
| Le pupitre des horizons    |     28 | 2 articulations                                | Créatif    |

La recherche de l’atelier inclut les noms des Brigos de la nomenclature :
« Roue Orbitale », « Essieu Traverse », « Palier Losange » ou « Articulation
Éclat ». Elle garde la recherche par nom/description, les filtres et la
pagination. Les couleurs des mécanismes sont libres ; la carrosserie, les
rebords et les cartes conservent quelques couleurs structurantes.

## Raccords réels

Le **Palier Losange**, nouveau modèle ajouté après les 57 précédents, est un
cadre chanfreiné de 2 × 2 × 2 avec un tunnel traversant suivant X. L’ouverture
occupe `y = 0,5…1,5` et `z = 0,5…1,5`. Ses quatre raccords supérieurs portent
le châssis. Les dix références #571 à #580 sont ajoutées en fin de catalogue :
les anciens numéros restent identiques. Le catalogue comprend 580 références,
dont 550 actives et 30 éditions archivées.

Un train posé au sol utilise une roue en `(-1, 0, 0)`, l’autre en `(4, 0, 0)`,
l’essieu en `(0, 0,5, 2,5)` et le palier en `(1, 0, 2)`. Leurs centres sont
coaxiaux à `y = 1, z = 3` ; le châssis commence à `z = 4`. La demi-grille est
limitée aux essieux des plans, perpendiculairement à leur axe et en hauteur.
Elle ne modifie ni les positions existantes, ni la grille du mode libre.

Le validateur exige des centres et axes identiques, ainsi que des normales
opposées aux extrémités roue/essieu. Le palier ne rejoint que le collier
central de l’essieu. Un pneu ou un essieu lisse ne reçoit pas de fausse douille
verticale. Les collisions du tunnel utilisent les quatre volumes solides du
cadre ; les placements fractionnaires sont indexés dans toutes les cellules
qu’ils touchent avant le contrôle exact de leurs volumes.

La notice pose les roues, puis l’essieu, puis le palier et le châssis. Le tri
par hauteur seul ne convient pas : le palier entoure un essieu situé plus haut
que sa base. Les articulations sont montrées au repos : coffres, tabliers et
plateaux restent fermés ou à plat. Leurs moitiés sont fixées séparément pour ne
pas bloquer le joint par une plaque unique ; aucune animation mécanique n’est
promise par le plan.

## Sauvegardes et rendu

Les 65 plans publiés sont conservés en tête, contrôlés par
`src/game/fixtures/published-v09-plan-digests.json`, capturé avant les ajouts.
Les instantanés historiques des migrations restent figés. La sauvegarde v10
reste inchangée : les nouveaux identifiants s’ajoutent sans démonter les
créations existantes. Les tests vérifient la réservation de couleurs mixtes,
l’export/import, la restitution exacte au démontage, le retrait de l’XP et
l’absence de revenu immédiat.

Les sept décors sont associés explicitement aux plans. Les aperçus transparents
sont préparés comme ceux du reste de l’atelier ; aucune carte ne reconstruit
la géométrie complète dans le DOM. Les dessins sont inspectés sous quatre
angles, et les sélections du tunnel sont testées en SVG et en 3D. Ces contrôles
ne constituent pas une simulation de contraintes physiques.

La [politique d’originalité](originality-policy.md) s’applique au palier et aux
plans. La [source officielle Fair Play](https://www.lego.com/en-us/legal/notices-and-policies/fair-play)
a été relue le 16 octobre 2026 pour cette évolution ; aucun asset tiers n’est
importé et aucune validation juridique n’est revendiquée.

Validation du 16 octobre 2026 : **2 141 tests dans 68 fichiers**, vérification
TypeScript et build réussis ; audit npm sans vulnérabilité signalée. Les 72
aperçus occupent **4,66 Mio**. Recherche par pièce, aperçu préparé, étapes
roues/essieu/palier, rotation et retour du focus ont été contrôlés dans les
fixtures sans sauvegarde, sur desktop et à 390/320 px, avec contrôle du mode
nuit et de la réduction des animations. Les articulations sont aussi soumises
à un graphe séparant leurs deux feuilles : un chemin rigide qui bloquerait
leur joint est refusé par les tests des nouveaux plans.
