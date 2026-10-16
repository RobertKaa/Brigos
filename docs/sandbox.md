# Atelier libre Brigo

Le bac à sable conserve les formes originales Brigo du catalogue. Il ne crée
aucune pièce gratuite et ne modifie aucun placement ou matériau d’un plan publié.

Chaque création est un projet indépendant, nommé par le joueur et sauvegardé
avec sa liste de références exactes, positions entières et rotations par quarts
de tour. Le plateau mesure 24 × 24 unités, pour 36 unités de hauteur. Une création
contient au plus 500 Brigos ; une partie contient au plus 20 créations libres.

## Stock et actions

- Poser un Brigo retire immédiatement un exemplaire du stock disponible.
- Déplacer ou tourner conserve la même référence et ne touche pas au stock.
- Retirer un Brigo restitue exactement cet exemplaire. Démonter un projet
  restitue toutes ses références, avec leurs couleurs d’origine.
- Les pièces posées sont réservées, au même titre que celles des plans ; elles
  sont absentes du stock disponible pour les autres constructions et le marché.
  Le recyclage conserve aussi son exemplaire de collection si celui-ci est dans
  une création libre.
- Toutes les opérations sont pures et atomiques. Un stock insuffisant, une
  collision ou un dépassement de capacité annule toute l’action. Le démontage
  échoue intégralement si la restitution dépasserait la capacité d’inventaire.
- Le mode créatif ne génère ni XP, ni monnaie, ni récompense pour le simple fait
  de poser et retirer des pièces. Il ne permet donc aucune boucle de gains.

Les contacts entre enveloppes sont permis, les intersections sont refusées.
Les enveloppes conservatrices incluent les espaces vides des arches : le mode
ne simule ni les points d’accroche ni la gravité. Les pièces flottantes restent
permises pour laisser le joueur composer librement. L’aide d’empilement place
la pièce au-dessus de la plus haute enveloppe chevauchant son empreinte.

## Poser et modifier

L’outil **Poser**, actif par défaut, sépare le ciblage de la sélection. Cliquer
ou toucher une brique vise son dessus sans sélectionner ni déplacer le support,
et conserve la référence choisie dans le stock. L’aperçu indique la nouvelle
position ; **Poser le Brigo** ou Entrée confirme et réserve un seul exemplaire.
Le ciblage suit la hauteur réelle du support et l’orientation du point de vue.

## Espace 3D

Le bac à sable utilise une caméra en perspective libre : glisser tourne autour
de la construction, la molette rapproche ou éloigne, et Maj + glisser déplace
le point de vue. Le bouton **Déplacer** permet aussi de déplacer la caméra
avec un seul bouton ou un seul doigt. Sur mobile, deux doigts déplacent la vue
et le pincement règle le zoom. **Vue du dessus** facilite les alignements ;
**Recentrer** retrouve l’ensemble de la création après un déplacement.

Un clic ou toucher bref vise le sol ou la vraie surface d’un Brigo. L’aperçu
reste à cette position pendant qu’on rejoint **Poser ici**, placé directement
dans la scène. Le clic ne change pas d’outil ; seul Modifier sélectionne une
pièce. Glissements, gestes à plusieurs doigts et gestes interrompus ne posent
rien. Les coordonnées et hauteurs manuelles restent utilisables pour composer
librement. Le clavier conserve flèches et Entrée, avec F pour recentrer et T
pour le dessus.

Les maillages procéduraux reprennent les volumes chanfreinés et raccords en
losange du dessin Brigo existant, y compris les ouvertures d’arches/fenêtres,
roues, essieux et articulations. Aucun modèle ou asset de fabricant n’est
importé. Les axes du moteur 3D ne changent pas les coordonnées de jeu, les
rotations ni les références réservées : aucune migration de sauvegarde n’est
nécessaire.

Three.js et ses contrôles sont chargés à la demande avec l’éditeur. Le rendu
est demandé uniquement après un geste, un redimensionnement ou une modification,
sans boucle d’animation au repos. Les géométries et matériaux sont partagés et
libérés à la fermeture. Dès 120 pièces, les corps et les contours sont
instanciés par matériau : 500 pièces identiques utilisent deux appels
de dessin pour leur construction. La visée ignore les contours de dessin et
retrouve l’identifiant exact de chaque instance. La perte du
contexte graphique libère le moteur puis affiche la vue de secours ; la pose
par coordonnées reste disponible.

Références techniques : [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)
pour les gestes et [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
pour le rendu. `scripts/review-sandbox.html?dense=1` prépare 500 pièces avec un
stock fictif ; le bouton de secours permet de vérifier une perte de contexte
sans toucher à une sauvegarde.

L’outil **Modifier**, près du terrain, permet de sélectionner une pièce posée
pour la déplacer ou la remettre en stock. Avant cette sélection, aucune pose
n’est possible. Choisir une pièce dans le stock, revenir à Poser ou changer de
projet annule la sélection et réactive l’empilage automatique. Le choix d’une
pièce dans la liste accessible active aussi Modifier. Les outils et le repère
ne modifient pas la sauvegarde avant confirmation d’un geste de construction.

## Sauvegarde v8

La v8 ajoute `sandboxProjects`, obligatoire et borné pour ce format. Les formats
antérieurs sont normalisés avec une liste vide ; ils ne peuvent contenir un
projet non vide sous une ancienne version. Aucune construction publiée n’est
démontée par cette migration, et le carnet, les gains, l’XP et l’inventaire
existants sont conservés.

Un lecteur v7 refuse la v8 avant de pouvoir supprimer ses références réservées.
La migration est persistée dans la transaction IndexedDB existante, avec
augmentation de révision. Deux onglets concurrents ne peuvent ni réserver le
même dernier exemplaire, ni le restituer deux fois ; une écriture obsolète est
refusée et le joueur reçoit l’état actualisé.

Le parseur vérifie les identifiants uniques, les références connues et
découvertes, les bornes et collisions, les dates et les noms de 1 à 48 caractères.
Les noms restent du texte React échappé ; aucune donnée importée n’est du HTML.
Les contrôles et caractères de direction cachés sont rejetés. Les champs
inconnus sont éliminés. Les collisions de sauvegarde utilisent un index des
colonnes du plateau, pour ne pas refaire des comparaisons quadratiques après
chaque geste.

Le plafond d’import passe de 1 à **3 Mo** afin de réimporter un export contenant
20 projets de 500 pièces. `SAVE_IMPORT_MAX_BYTES` est partagé entre le parseur
et l’interface d’import. La taille en octets UTF-8 est contrôlée avant le JSON,
puis les limites structurelles s’appliquent sans créer de données supplémentaires.

## Vérifications

Les tests couvrent la conservation du stock, les rotations, le plafond de
hauteur, les collisions, les limites, les échecs atomiques, les doublons, les
imports mal formés, la migration idempotente, le refus des anciens clients,
la concurrence de deux onglets et l’export/import au plafond de 10 000 pièces.
Les aperçus visuels de développement ne doivent pas accéder à la sauvegarde du
joueur.

La livraison complète passe 44 fichiers de tests, soit **1 388 tests** ; TypeScript,
build de production et audit npm ont été vérifiés. Aucun paquet applicatif n’est
ajouté. L’éditeur est chargé à la demande depuis l’atelier.

Le parcours a aussi été joué dans `scripts/review-sandbox.html`, une partie
strictement en mémoire : pose avec décrément du stock, déplacement conservant la
quantité, retrait restituant un exemplaire, renommage, démontage restituant tout
le stock, puis épuisement de quatre roues bloquant une cinquième pose. Zoom,
rotation du point de vue, navigation clavier et pose par Entrée ont été contrôlés.
À 390 px, le défilement du terrain agrandi reste interne à l’éditeur, sans
débordement horizontal de la page. L’accès réel `#workshop` → `#sandbox` conserve
l’onglet Atelier actif sans ajouter de cinquième bouton à la navigation mobile.

Mesure locale Node/Vite SSR de la validation complète, 25 répétitions après
préparation, avec 500 plaques denses sur 20 niveaux : médiane **0,36 ms** pour
un projet et **3,43 ms** pour 20 projets / 10 000 placements (maximum **4,34 ms**).
Ces mesures du parseur ne prétendent pas mesurer les images par seconde dans
le navigateur.
