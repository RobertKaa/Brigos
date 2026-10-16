# Grands projets — version 0.5

La série passe de 42 à 45 plans, sans nouvelle forme ni nouvelle couleur. Chaque quantité est calculée à partir des placements réels ; les fondations, planchers, murs et détails font tous partie du montage et de son inventaire réservé.

| Plan original               | Brigos | Dimensions au sol, en tenons | XP exposée |
| --------------------------- | -----: | ---------------------------- | ---------: |
| Les jardins d’Astréval      |    915 | 48 × 42                      |      2 830 |
| Le palais des aurores       |  2 235 | 72 × 48                      |      5 470 |
| La citadelle des huit tours |  3 545 | 96 × 84                      |      8 090 |

Les jardins réunissent un palais à observatoire, deux pavillons, dix travées de galeries, quatre parterres, une fontaine, 24 plantes et quatre arbres fruitiers. Le palais possède neuf pavillons, des façades fenêtrées sur quatre côtés, des ailes étagées, des corniches dorées et deux lanternons montés sur de vraies plateformes à tenons. La citadelle comprend huit tours, une enceinte à galeries, six maisons et un donjon central de six étages, avec des baies arquées et des parapets à créneaux.

Près de la moitié ou davantage des pièces de chaque projet ont une dimension d’au moins quatre tenons. Le palais et la citadelle emploient seulement 8 et 12 briques 1×1, pour les montants des bancs. La quantité vient des volumes et détails du domaine, sans découper artificiellement les grandes surfaces en petites briques.

Les dimensions des grands sets ont servi de repère quantitatif : [Tudor Corner, 3 266 pièces](https://www.lego.com/fr-fr/product/tudor-corner-10350) et [Lion Knights’ Castle, 4 514 pièces](https://www.lego.com/fr-fr/product/lion-knights-castle-10305), consultés le 9 octobre 2026. Les plans du jeu ont leurs propres noms, géométries et palettes.

## Simplification des petits plans

Le sapin utilise 13 pièces du catalogue habituel : un socle, un tronc court, un feuillage triangulaire plein et six pentes. Les trois cônes précédemment ajoutés sont archivés. Ils ne sortent plus des boîtes et ne sont requis par aucun plan, mais leurs références historiques, découvertes, exemplaires possédés et anciennes ouvertures restent valides. Un nouvel album compte 510 références actives ; les archives déjà découvertes s’y ajoutent.

Onze plans existants changent de géométrie ou de nomenclature : banc, sapin, maison, château, Brigosaurus, bateau, avion, borne d’arcade, chalet, tasse et aqueduc. Les rangées adjacentes de même couleur ont été fusionnées en grandes pièces quand leurs attaches et la silhouette le permettaient. Les détails distincts, pieds séparés, yeux et motifs gardent les petites pièces nécessaires.

## Parcours et performances

L’atelier propose un filtre Légendaire et un accès direct aux grands projets. Leur lecteur conserve la notice pièce par pièce et les quatre orientations, avec des lots de 150 pièces et un zoom de ×1 à ×4 dans une zone défilante. Les quantités et l’XP utilisent le format français.

Les grands aperçus dessinent chaque pièce, en omettant les minuscules meshes des tenons à cette échelle. Le tri des pièces respecte en priorité les empilements ; les ambiguïtés de projection autour des arches ne peuvent plus inverser un support et sa pièce supérieure. La validation des attaches indexe les cellules et les plans d’emboîtement au lieu de comparer chaque paire de volumes. L’ordre de montage se vérifie en une passe.

Une création Légendaire apporte 1 000 XP de difficulté, plus 2 XP par pièce. Démonter retire toute cette XP, comme pour les autres difficultés. Une création Légendaire compte aussi pour le défi Maître d’œuvre, dont la récompense demeure unique.

## Validation et sauvegardes

Les tests vérifient collisions, attaches, connectivité, ordre de montage, nomenclatures exactes, dessin de chaque emplacement et superposition sous les quatre angles. Ils couvrent aussi assemblage/import/démontage des grands projets, conservation des références exactes, XP, absence de modèles archivés dans les tirages et dans les nouveaux plans.

La sauvegarde v5 / `planRevision: 1` migre les versions précédentes à partir des instantanés historiques. Les créations dont la géométrie ou les pièces changent sont démontées et leurs pièces exactes sont restituées. Les montages inchangés sont conservés. La migration est atomique, ne rembourse qu’une fois et préserve les archives. Voir [les règles de migration](save-migrations.md).

Les rendus SVG/PNG des quatre vues sont produits par le composant réel `ConstructionArt`. La vérification interactive desktop/mobile dans le navigateur n’a pas pu être effectuée lors de cette passe : le contrôle d’autorisation a refusé l’accès au navigateur de test. La revue responsive est statique ; les exports visuels et tests automatisés ont été exécutés indépendamment de la partie du joueur.
