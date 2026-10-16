# Fluidité des étapes de montage

Contrôle du 9 octobre 2026, après la bibliothèque v0.7.

## Correction

Changer d’étape recalculait les primitives SVG, les projections et les relations de profondeur entre toutes les pièces visibles. Cela relançait aussi le rendu du stock et de la liste des pièces du plan.

- La géométrie, le cadrage et les graphes de profondeur sont désormais préparés par recette, allocation de couleurs et orientation.
- Chaque étape trie seulement son préfixe visible en réutilisant ces relations. Elle conserve exactement l’ordre du précédent algorithme, y compris les occlusions ambiguës et les contraintes d’empilement. Filtrer simplement l’ordre du plan complet donnerait un résultat différent à certaines étapes.
- Au-delà de 180 pièces, les couches et éléments JSX des briques sont réutilisés. Le calcul des tenons masqués est évité sur ces plans, dont le dessin simplifié ne les affiche déjà pas. Les petits plans continuent à actualiser leurs tenons à chaque étape, même en revenant en arrière.
- Le lecteur possède son état local. Changer d’étape, zoomer ou tourner ne relance plus le calcul du stock, du devis et de la liste des références.
- Les préparations restent locales à chaque instance. Changer de recette, de couleurs ou d’orientation les remplace ; aucun historique des étapes ni cache global ne s’accumule.

Les placements, exigences, XP et sauvegardes restent identiques. Aucun changement de format ni nouvelle dépendance.

## Mesures

Dans Chrome, via `React.Profiler` de l’aperçu de développement isolé, cinq clics successifs sur « Pièce précédente » ont été comparés sur la citadelle de 3 545 pièces, aux étapes 3 544 à 3 540, dans la même vue.

| Mesure du rendu React |          Avant |      Après |
| --------------------- | -------------: | ---------: |
| Médiane               |       249,5 ms |     4,6 ms |
| Intervalle observé    | 231,7–374,1 ms | 4,2–4,7 ms |

Ces mesures portent sur le rendu React en développement sur cette machine, pas sur le délai complet entre une interaction et les pixels affichés, ni sur une garantie pour tous les appareils. La préparation initiale d’une vue conserve un coût ponctuel ; elle n’est plus répétée à chaque étape.

Les relevés sont conservés dans `.artifacts/browser-steps-before.json` et `.artifacts/browser-steps-final.json`. Les scripts de comparaison SVG et de tri utilisent Vite en middleware, sans ouvrir de port ni démarrer de serveur supplémentaire.

## Vérifications

- **977 tests dans 26 fichiers** passent, dont 22 nouveaux tests sur le tri préparé, la réutilisation des couches, les couleurs, les tenons, les lots et les bornes des commandes.
- Build TypeScript et Vite validé.
- Les SVG restent identiques dans **60 comparaisons exactes** : trois monuments, quatre orientations, cinq étapes par vue.
- Le tri préparé est comparé à une implémentation indépendante de l’algorithme précédent, sur des scènes ambiguës et des plans dans les quatre orientations.
- Curseur au début et à la fin, navigation rapide en arrière, changement de lot, rotation et zoom contrôlés dans le navigateur avec une partie fictive, sur desktop et aux largeurs mobiles de 390 et 320 pixels. Aucun débordement horizontal de la modale à ces largeurs. Captures : `.artifacts/brigo-step-performance-desktop.png` et `.artifacts/brigo-step-performance-mobile.png`.
- Les contrôles de sécurité et de sauvegarde de la suite passent. L’aperçu n’importe ni le dépôt IndexedDB ni le hook de partie ; ses commandes de jeu sont neutralisées. Le mesureur de rendu et les données fictives sont absents du build de production.

Le serveur existant et la partie réelle n’ont pas été modifiés pendant ces vérifications.
