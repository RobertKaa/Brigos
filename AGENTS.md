# Consignes permanentes du projet Brigos

Ces règles s'appliquent à tout le projet et à toutes les conversations futures qui travaillent dans ce dossier.

Le nom officiel du site et de son univers est **Brigos**. Employer « Brigos » dans tous les textes, logos, cartes et métadonnées publics ; ne pas ajouter « Club ». Conserver les anciens identifiants techniques de stockage pour protéger les sauvegardes existantes.

Le mot-symbole s’écrit **Brigos**, avec seulement la première lettre en majuscule. Dans le logo complet de l’en-tête, le symbole tient lieu de B et précède uniquement « rigos » : ne pas afficher un second B typographique.

Le symbole est un B construit avec les vraies pièces Brigos, leurs chanfreins et raccords losange. Réutiliser ce même assemblage pour tous les logos, cartes et icônes. Préparer son dessin avec `node scripts/export-brand-assets.mjs` après une modification ; ne pas charger le moteur de construction dans chaque logo, ni agrandir l’en-tête pour son affichage.

Les modifications restent locales par défaut. Ne pas pousser sans demande explicite de publication de l’utilisateur. Chaque push sur `main` doit déclencher la vérification puis le déploiement automatique sur Cloudflare ; ne pas remplacer cette liaison par des publications manuelles régulières. Garder GitHub Pages actif jusqu’à sa désactivation par l’utilisateur.

- Toujours penser à l'UI/UX, à l'harmonie du design et à l'ergonomie.
- Vérifier systématiquement les versions desktop et mobile, la navigation clavier, les contrastes et les préférences de réduction des animations.
- Préserver des parcours directs et une hiérarchie claire : navigation Boîtes / Atelier / Libre / Collection / Quêtes, action principale avant promotions et statistiques, détails avancés à la demande. Suivre [les parcours UI/UX](docs/ux-flows.md).
- Vérifier les tests unitaires, en ajouter quand ils couvrent un comportement utile, et vérifier la sécurité.

## Règle impérative : créations originales et respect des droits LEGO

Tout ce qui est créé, ajouté ou modifié sur le site doit respecter les droits de propriété intellectuelle et les politiques du groupe LEGO. Cette règle couvre les formes des pièces et connecteurs, les constructions, les personnages, les illustrations, les animations, les cartes, les boîtes, les marques et les notices.

- Concevoir un langage de formes Brigos original et distinctif. Ne pas reproduire les silhouettes, proportions, rangées de tenons cylindriques ou éléments spécifiques reconnaissables des produits LEGO. Préférer les volumes chanfreinés et les connecteurs bas en losange propres à Brigos.
- Ne jamais copier, décalquer, importer ou reconstituer un set, une figurine, une notice, une photographie, un emballage ou un asset LEGO. Un changement de couleur ou un filtre manga ne rend pas une copie originale.
- Créer les constructions et leurs décors de manière indépendante ; garder la provenance des éventuelles références et n'utiliser que des ressources autorisées. Ne pas copier non plus les créations de tiers.
- Ne pas employer le logo LEGO, suggérer une affiliation, une licence ou une compatibilité officielle, ni faire de la marque un argument marketing. Un avertissement de non-affiliation ne corrige pas une utilisation interdite.
- Avant d'ajouter une forme, un modèle ou un asset, vérifier son caractère original et les sources officielles pertinentes. En cas de doute concret non résolu, remplacer le contenu par une création distincte ; ne pas le présenter comme juridiquement validé.
- Les tests et la revue visuelle constituent des garde-fous de développement, pas une garantie juridique. Avant exploitation commerciale, faire examiner les éléments concernés si leur statut reste incertain.

Lire [docs/originality-policy.md](docs/originality-policy.md) pour les sources officielles et les critères de revue. Cette règle ne doit pas être contournée par un futur changement de style ou l'ajout de contenu généré.

## Sauvegardes et vérification

- Conserver les identifiants historiques et numéros du catalogue. Ajouter les modèles en fin de liste.
- Toute modification des placements ou matériaux d'une recette publiée exige une migration selon `docs/save-migrations.md`.
- Pour les tests visuels, préférer les aperçus `scripts/review-*.html` qui n'accèdent pas à la sauvegarde du joueur.
- Préserver le rendu léger des constructions de l'atelier : suivre `docs/workshop-rendering.md`, employer les aperçus préparés et régénérer leurs empreintes après un changement du dessin. Ne pas réintroduire des milliers de tracés par carte.
- Conserver la grammaire manga des dessins selon `docs/manga-direction.md` : volumes chanfreinés, encre affirmée, ombres en aplats et hachures localisées. Garder les raccords losange et la cohérence entre cartes, modèles préparés et scène 3D ; le trait décoratif ne participe jamais à la sélection ou aux collisions.
- Pour l'économie et les activités récurrentes, suivre `docs/daily-journal.md` : gains accessibles depuis zéro ressource, aucune pénalité de jour manqué, récompenses atomiques et impossibles à réclamer deux fois. Préserver le format de sauvegarde des marqueurs déjà reçus.
- Le bac à sable n’utilise que l’inventaire disponible. Chaque placement réserve une pièce exacte ; retrait et démontage restituent ces mêmes exemplaires, sans duplication. Préserver les réservations dans l’album, le recyclage et les migrations (`docs/sandbox.md`).
- La scène 3D du bac à sable doit conserver les formes Brigos originales, les mêmes coordonnées de jeu et les réservations. Distinguer un clic de visée des gestes de caméra, préserver le clavier et le tactile, charger le moteur à la demande et ne pas maintenir de boucle GPU au repos. Prévoir une vue de secours et libérer les ressources à la fermeture.
- Les constructions sur plan produisent uniquement de la monnaie selon `docs/production.md` : cycles de 1, 2, 4 ou 8 h selon la taille, rendement modéré par exemplaire, réserve de 72 h et récolte atomique par pile. Préserver les compteurs de la sauvegarde v10, les gains antérieurs et la fraction de cycle lors des migrations ; aucun gain rétroactif au nouveau barème ni gain immédiat en reconstruisant. Les projets libres restent sans revenu.
- Avant livraison : `npm test`, `npm run check`, `npm run build`, puis vérifier les parcours concernés sur desktop et mobile.
