# Direction dessin Brigos

L’encrage manga s’applique aux pièces elles-mêmes, aux cartes, aux boîtes, aux constructions et au bac à sable 3D. Il reste une création vectorielle et géométrique du projet, sans image de fabricant, modèle importé ou imitation d’un artiste particulier.

## Volumes et trait

- Encre chaude `#252127`, contours plus appuyés et traits intérieurs plus fins. Dans le dessin vectoriel : 1,55 unité pour les faces larges, 0,9 pour les raccords et détails, 0,7 pour les petites facettes.
- Chanfreins visuels à 0,18 unité, raccords bas en losange, roues facettées à moyeu géométrique. Les dimensions de jeu, coordonnées d’assemblage et emprises des pièces restent les mêmes.
- Ombres de couleur en aplats francs, hachures courtes et irrégulièrement espacées sur les faces d’ombre, quelques accents de pinceau effilés. Les lumières sont de fins traits ivoire placés à l’intérieur des faces.
- Pas de tremblement animé, de déformation de la construction ou de détails aléatoires à chaque rendu. Les profils restent lisibles dans les quatre orientations et à petite taille.

Les tracés de pinceau et de lumière sont calculés dans le polygone de chaque face ; les hachures sont découpées géométriquement. Ni filtres SVG ni masques par pièce ne sont nécessaires. Le dessin direct et les images sérialisées partagent les mêmes attributs d’encrage.

## Cartes et environnements

Les cartes associent doubles filets, trames localisées hors du centre, bande de rareté et ombre imprimée. Chaque rareté conserve un nom, un symbole et une couleur. En nuit, le panneau du dessin reste un papier grisé pour préserver la lecture des contours ; les informations suivent les couleurs de l’interface.

Les 21 environnements gardent leur propre vocabulaire de matière : hachures du bois, reflets de l’eau, cassures de la pierre, neige et éléments d’intérieur. Les ombres découpées et les silhouettes accompagnent la construction, avec au maximum 16 éléments SVG de décor. Le décor se retire pendant les étapes de montage.

## Vue 3D

Les contours sont des rubans de triangles extrudés dans le shader, de 2,1 pixels CSS, et non une largeur de ligne native ignorée par certains GPU. Leur épaisseur suit la taille du canvas sans changer les coordonnées physiques. Ils sont exclus de la sélection, y compris dans les groupes instanciés.

Les couleurs utilisent trois niveaux d’éclairage dessinés, indépendants de l’éclairage très lumineux de l’éditeur. Des hachures procédurales s’atténuent avec la distance pour limiter le moiré. Aucun post-traitement plein écran, texture distante ou animation permanente n’est ajouté. Corps et encre restent instanciés : deux appels de dessin pour 500 pièces simples identiques, hors plateau et aides de placement. Les formes mécaniques à plusieurs matières ont davantage de passes.

## Aperçus préparés et revue

La section `#manga-inspector` de la planche propose les 58 modèles, y compris les trois archivés, sous quatre angles, avec sélection de la pièce et modes jour/nuit. La section `#assembly-inspector` permet aussi de comparer les 72 constructions dans leurs quatre orientations pour inspecter les raccords entre pièces.

Le dessin des constructions est versionné `manga-6` et les 65 images préparées sont régénérées avec leurs empreintes. Les pentes partagent désormais les chanfreins de la géométrie 3D ; le pneu et les plans successifs du moyeu ont aussi les mêmes profondeurs dans les deux rendus. Suivre [le contrat de rendu léger](workshop-rendering.md) après toute modification du trait.

Pour les portes, la face avant du cadre passe après le vantail et ses reliefs : un tri par profondeur moyenne ne suffit pas pour ces surfaces de hauteurs différentes. Les joues intérieures conservent leur ordre ; les raccords passent ensuite. La poignée est placée vers l’intérieur du vantail pour rester visible dans les vues obliques, en SVG comme en 3D. Les tests contrôlent des points projetés du cadre et du vantail dans les quatre orientations, ainsi que le premier impact des rayons en 3D.

Les essieux et articulations sont dessinés par composants, de l’arrière vers l’avant selon l’axe de la caméra. Le métal enfermé dans leurs supports n’est pas peint ; les petites pointes exposées autour du chanfrein central de l’essieu sont conservées. Les tests comparent le premier impact sur les véritables triangles 3D à la surface peinte au même point dans le dessin vectoriel, sous les quatre orientations.

Le test de silhouettes compare les pleins et ouvertures SVG aux intersections des vrais triangles 3D pour les 58 modèles dans quatre orientations. Il échantillonne une grille de 19 × 19 points par vue, en écartant les contours à moins de 0,05 pixel SVG pour éviter les seules différences d’arrondi. Il contrôle la silhouette, pas la couleur du dernier polygone peint ni tous les raccords possibles. La régression de la maison contrôle séparément la surface effectivement peinte sur ses trois niveaux de mur au bord de la porte.

`scripts/review-manga.html` affiche les composants réels sans accéder à une sauvegarde. Son bouton jour/nuit ne change aucune préférence persistante. `scripts/review-sandbox.html` et `?dense=1` vérifient la scène 3D, les contours, la sélection et les grands projets en mémoire. Contrôler les cartes à 390 et 320 px, les pièces claires et sombres, les cinq raretés et la scène au repos.

La [règle d’originalité](originality-policy.md) reste applicable. La politique officielle [Fair Play](https://www.lego.com/en-us/legal/notices-and-policies/fair-play) a été consultée de nouveau le 16 octobre 2026 ; cette revue de dessin n’est pas une validation juridique.
