# Identité Brigos

Le nom public officiel est **Brigos**. Le logo et les cartes portent uniquement ce nom. Les anciens identifiants techniques de sauvegarde restent inchangés.

Le domaine `brigoslab.com` est détenu par le projet depuis le 17 octobre 2026, avec une zone DNS chez OVH. « BrigosLab » désigne l’adresse du projet, sans remplacer le nom du jeu dans l’application. Sa possession ne confirme ni l’hébergement de l’application ni l’activation des emails ; suivre [la configuration des emails](email-delivery.md).

Le mot-symbole s’écrit « Brigos », avec seulement le B en majuscule. Le B est une construction originale de **13 pièces du catalogue**, en Corail, Mandarine et Soleil, avec deux ouvertures et un lobe inférieur plus large. Il précède « rigos », sans seconde initiale typographique. Le même B est utilisé dans l’en-tête, le pied de page, les boîtes, le coffre, les cartes et le favicon. La variante monochrome conserve les volumes et les séparations entre pièces.

Le B mesure 66 unités dans le cadre de 82 unités du logo complet : sa hauteur augmente d’environ 12 % par rapport à l’ancien symbole, sans augmenter la hauteur de l’en-tête. Les largeurs maximales du mot complet restent de 150 px sur ordinateur, 120 px sur mobile et 104 px à 320 px.

Les modifications restent locales jusqu’à une demande explicite de publication. Un push sur `main` déclenche GitHub Pages et ne doit donc pas accompagner automatiquement chaque modification.

Les noms des fichiers historiques, types, commandes, clés de stockage et tables ne changent pas. Le logo est une illustration ; il ne crée ni recette jouable ni ressource dans les sauvegardes.

La direction v0.9 est celle d’un carnet de collection illustré : papier ivoire,
encre anthracite, vermillon et jaune citron, contours imprimés, trames et
hachures. Les titres sont denses, les actions encadrées et les compositions
conservent un rythme lisible sur desktop et mobile. Le symbole B s’intègre
au mot « Brigos » arrondi ; ses raccords facettés restent propres à cet univers.

Les pièces sont des créations Brigos à volumes chanfreinés et raccords bas en
losange. Les illustrations privilégient les traits d’encre et les ombres
dessinées. Les constructions apparaissent dans des décors originaux par thème ;
les étapes de montage conservent un fond dégagé. Voir la
[règle d’originalité](originality-policy.md), obligatoire pour tout futur asset.

Le mode jour utilise un papier chaud et une encre sombre ; le mode nuit utilise
un papier charbon, une encre claire et des accents ajustés. Les tokens se
trouvent dans `src/studio-theme.css`. `src/theme.ts` et `src/useTheme.ts` gèrent
l’apparence séparément de la sauvegarde de jeu. Le réglage initial suit
l’appareil ; l’utilisateur choisit son ambiance dans l’en-tête ou le guide.

Les cartes ont un cadre imprimé, un numéro, une couleur, un symbole et un nom
de rareté. Leur dos donne un indice de rareté par son halo et son symbole,
sans révéler la référence. Les cinq raretés restent identifiables sans dépendre
uniquement de la couleur ; les animations respectent la réduction des mouvements.

Les boîtes suivent une progression de gamme : **Découverte ardoise argentée
(100 pièces), Atelier bleu (250 pièces), Prisme violet avec rubans dorés
(500 pièces)**. Le gris, le bleu et le violet reprennent les repères des raretés
commune, rare et épique. Les accents dorés restent discrets : aucune boîte ne
garantit une pièce légendaire. Les chances standard de Rare ou mieux augmentent
de 16 à 34 puis 60 % ; les probabilités affichées suivent toujours les réglages
effectifs de la partie, y compris les personnalisations administrateur.

`BOXES` dans `src/game/catalog.ts` centralise la face (`color`) et les ombres,
lumières, rubans et accents (`palette`). Le comptoir, la fiche de probabilités,
le coffre animé et le sélecteur de la boîte suivante partagent ces couleurs,
en jour comme en nuit. La sélection conserve sa coche et son état accessible ;
la couleur n’est jamais son seul indicateur. Cette évolution ne change ni les
prix, ni les probabilités, ni les sauvegardes.

`src/components/brigoMonogram.ts` définit les placements exacts et prépare leurs
faces avec les géométries Brigos existantes. Sa caméra plus frontale préserve les
deux ouvertures aux petites tailles. La projection habituelle des autres pièces
et constructions reste inchangée, avec un contrôle de tous les modèles dans les
quatre orientations.

`src/components/brigo-monogram.json` contient le dessin préparé. Le composant
`BrigoLogo.tsx` l’utilise comme une seule image vectorielle embarquée par logo,
sans moteur de rendu au chargement de l’en-tête. Les fines hachures et touches de
pinceau sont omises à la taille du logo ; les pièces, chanfreins, raccords bas en
losange, contours et lumières sont conservés. Le nom utilise les tracés locaux
Outfit de « rigos » (SIL Open Font License). Aucun script, police, identifiant
SVG partagé ou ressource externe n’est embarqué dans les images.

Les fichiers autonomes sont exportés dans `public/branding` :

- `brigo-logo.svg` : logo complet sur fond clair ;
- `brigo-logo-light.svg` : logo complet sur fond sombre ;
- `brigo-wordmark.svg` : B construit et « rigos », monochrome ;
- `brigo-mark.svg` : B construit seul.

Le favicon `public/favicon.svg` reprend exactement le même B construit sur un
carré encre. Aucun script ou identifiant SVG partagé
n’est nécessaire. Les SVG de l’interface sont décoratifs : le lien d’accueil
conserve son nom accessible « Brigos, accueil » et son focus clavier.

Pour réexporter les fichiers depuis le composant commun :

```sh
node scripts/export-brand-assets.mjs
```

Cet export prépare le dessin JSON avant les quatre SVG et le favicon. Il utilise
Vite en mode middleware, sans serveur HTTP ni WebSocket. Les tests vérifient la
fraîcheur du dessin, les appuis et les deux ouvertures, les exports, l’absence de
ressources externes et le faible nombre de nœuds du logo dans l’interface.

`scripts/review-brand.html` compare le logo sur papier clair et fond sombre,
les tailles d’icône 16/24/32/40/64 px et les SVG autonomes. Cette planche ne lit ni
n’écrit aucune sauvegarde. `scripts/review-journeys.html` permet de vérifier
l’en-tête réel sur ordinateur et à 320/390 px.

L’aperçu `scripts/review-studio.html` permet de vérifier le logo dans l’interface
avec une partie fictive. `scripts/review-chest.html` permet d’inspecter sa
présentation sur le coffre sans ouvrir de boîte réelle. Le paramètre
`theme=dark` active le mode nuit dans les aperçus studio et ouverture, sans
modifier la partie.
