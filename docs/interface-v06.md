# Interface v0.6

Refonte du 9 octobre 2026 : fond crème, surfaces bleu nuit, accents dorés et turquoise, typographie et actions principales plus lisibles. La navigation devient une barre basse sur mobile, avec prise en compte de la zone réservée aux gestes du téléphone.

## Parcours

- Accueil : choix de boîte près de l’action, prix ou réserve utilisée explicites, chances de rareté accessibles, album et projet suivi visibles.
- Collection : références découvertes, pièces disponibles, pièces réservées et exemplaires supplémentaires distingués ; recherche, tris, filtres avancés repliables et grille responsive.
- Atelier : suggestion de prochain assemblage, tri par proximité, raccourcis vers les plans prêts et légendaires, progression et pièces manquantes explicites. Les 45 plans et leurs quantités sont conservés.
- Ouverture : coffre en volume CSS avec couvercle articulé, lumière et envol de pièces ; dix cartes, révélation individuelle, cascade ou immédiate ; prochaine boîte dans la même fenêtre avec coût et réserve affichés.
- Modales, administration, préférences, progression et notifications harmonisées avec le thème.

L’animation peut être passée et le réglage de réduction des animations évite l’attente. Les commandes de révélation précèdent la grille sur mobile. Le clavier reste sur le butin après une révélation, sans défilement vers l’action d’ouverture suivante. Les cartes cachées ne divulguent ni leur rareté ni leur contenu au lecteur d’écran.

## Quantités et sauvegardes

`BOX_DROP_COUNT` vaut 10. Les prix de 100, 250 et 500 pièces restent identiques. Chaque action crédite exactement dix résultats en une transaction ; l’animation ne génère ni ne crédite de pièces.

Le format de sauvegarde reste v5 avec `planRevision: 1`. Une ouverture historique ou en cours contient exactement cinq ou dix résultats. Les anciennes ouvertures de cinq sont reprises telles quelles, sans complément ni recrédit. Les règles d’XP, constructions, récompenses, inventaire réservé et probabilités par pièce sont conservées.

## Vérification

- Suite Vitest : 691 tests, 19 fichiers. Compatibilité des anciennes sauvegardes, ouvertures de dix, atomicité, concurrence IndexedDB, validation des imports, progression, tris et résumés, sessions de révélation et rendu des écrans.
- TypeScript et build de production validés.
- `npm audit` : aucune vulnérabilité signalée, dépendances de développement comprises.
- Consultation visuelle à 1280 et 1460 px sur desktop, 320 et 390 px sur mobile. Débordements de l’introduction de l’album et des onglets admin corrigés à 320 px.
- Fiches Brigos, probabilités, grand plan légendaire et administration vérifiés sur mobile. Coffre, cascade, révélation immédiate, enchaînement, reprise de cinq cartes et animations réduites vérifiés sur données fictives. Dix cartes révélées et focus conservé sur la première carte confirmés dans le navigateur.

Les aperçus `scripts/review-opening.html` et `scripts/review-studio.html` utilisent les vrais composants avec des données fictives, sans lecture ni écriture de sauvegarde. Ils sont réservés au développement et exclus du build principal. Le serveur existant a été conservé pendant les vérifications.
