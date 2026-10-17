# Carnet Brigos — direction visuelle v0.9

Livraison du 15 octobre 2026. Cette direction s'appuie sur les créations indépendantes décrites dans [la politique d'originalité](originality-policy.md) et sur les règles permanentes de `AGENTS.md`.

## Changements

- Papier ivoire, encre, vermillon et citron ; composition éditoriale, cadres imprimés et trames. Une palette nuit complète conserve la même identité.
- Dix cartes sortent de la boîte. Chaque dos possède un halo, un symbole et un libellé propres à sa rareté. Les cadres épique et légendaire ajoutent leurs propres repères. Révélation individuelle, en cascade ou immédiate, focus clavier et réduction des mouvements conservés.
- Cartes de collection numérotées avec illustration, forme, couleur, rareté et nombre d'exemplaires.
- Brigos chanfreinés à raccords bas en losange, dessin d'encre et hachures. Les silhouettes arrondies sont facettées. Le logo et les boîtes partagent cette grammaire.
- Décors dessinés pour la nature, les lieux, les véhicules et les objets. Ils disparaissent pendant la lecture des étapes afin de garder les pièces lisibles.
- Roue Orbitale, Essieu Traverse et Articulation Éclat : trois modèles disponibles en dix couleurs, ajoutés après les références historiques. Ils enrichissent les tirages et la collection ; les recettes publiées ne sont pas modifiées pour les employer.

## Compatibilité et sécurité

Les numéros historiques, identifiants de pièces, placements des recettes et données du joueur sont conservés. Le format de sauvegarde reste v6, car les ajouts au catalogue sont append-only et les changements de construction portent sur le dessin. Le thème est mémorisé dans une clé de préférence dédiée, validée avant utilisation ; le site fonctionne aussi si le navigateur refuse ce stockage. Aucun nouvel appel externe ni dépendance n'est ajouté.

Les formes ont été dessinées dans le projet, sans importer d'assets ou de notices LEGO. Les garde-fous visuels et tests ne constituent pas une validation juridique.

## Vérifications

- Suite complète : **1 125 tests réussis**, dont géométrie des plans dans les quatre orientations, sauvegardes et migrations, conservation des numéros, nouveaux mécanismes, dos de cartes accessibles et préférence de thème.
- Vérification TypeScript et build Vite réussis. Le build conserve un avertissement de taille sur les gros bundles de l'application et de Pixi, chargement des confettis à la demande conservé.
- Audit npm : **0 vulnérabilité signalée**.
- Contrôles navigateur sur le serveur existant au port 5173, avec les aperçus indépendants de la sauvegarde pour les actions de test. Halos des cinq raretés, retournement individuel et complet, recherche des nouvelles roues, changement d'ambiance, progression des étapes et rotation du chalet vérifiés.
- À 390 px, plateau d'ouverture sur deux colonnes ; largeur interne de la modale égale à sa largeur de contenu, sans défilement horizontal. La collection à 320 px conserve deux colonnes et ne déborde pas. La tablette utilise trois colonnes de cartes d'ouverture, le desktop cinq.

Pour rejouer les contrôles : `scripts/review-studio.html?theme=dark`, `scripts/review-opening.html?motion=reduced&theme=dark`, ou la variante `count=5` pour une carte de chaque rareté. Ces aperçus restent réservés au développement.
