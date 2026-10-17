# Identité Brigos

Le nom public officiel est **Brigos**. Le logo et les cartes portent uniquement ce nom. Les anciens identifiants techniques de sauvegarde restent inchangés.

Le domaine retenu est `brigoslab.com` ; « BrigosLab » désigne l’adresse du projet, sans remplacer le nom du jeu dans l’application. Son achat et la configuration des emails restent séparés de ce renommage.

Le 17 octobre 2026, le mot-symbole existant est seulement adapté à l’orthographe « Brigos ». Le symbole, les couleurs et la composition actuels sont conservés pour cette étape. Une refonte du logo doit ensuite faire l’objet d’un travail de concept et de composition cohérent avec l’application, puis être vérifiée aux tailles réelles d’usage ; ce renommage ne constitue pas cette refonte.

Le renommage est vérifié avec 2 337 tests, TypeScript, le build client et le bundle serveur. Le contrôle visuel couvre l’ordinateur et les largeurs 320/390 px, les thèmes jour/nuit, le clavier et la réduction des animations. Les noms des fichiers, types, commandes, clés de stockage et tables historiques ne changent pas.

La direction v0.9 est celle d’un carnet de collection illustré : papier ivoire,
encre anthracite, vermillon et jaune citron, contours imprimés, trames et
hachures. Les titres sont denses, les actions encadrées et les compositions
conservent un rythme lisible sur desktop et mobile. La marque accompagne
un mot « Brigos » arrondi ; ses raccords facettés restent propres à cet univers.

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

`src/components/BrigoLogo.tsx` définit le symbole et les déclinaisons communes
à l’en-tête, au pied de page, aux boîtes et au coffre animé. Les lettres sont
des tracés vectoriels issus de la police Outfit déjà présente dans le projet
(SIL Open Font License) ; le logo ne charge aucune police ni ressource externe.

Les fichiers autonomes sont exportés dans `public/branding` :

- `brigo-logo.svg` : logo complet sur fond clair ;
- `brigo-logo-light.svg` : logo complet sur fond sombre ;
- `brigo-wordmark.svg` : mot-symbole monochrome ;
- `brigo-mark.svg` : symbole seul.

Le favicon `public/favicon.svg` reprend exactement le même symbole sur un
carré encre. Aucun script ou identifiant SVG partagé
n’est nécessaire. Les SVG de l’interface sont décoratifs : le lien d’accueil
conserve son nom accessible « Brigos, accueil » et son focus clavier.

Pour réexporter les fichiers depuis le composant commun :

```sh
node scripts/export-brand-assets.mjs
```

Cet export utilise Vite en mode middleware, sans serveur HTTP ni WebSocket.
L’aperçu `scripts/review-studio.html` permet de vérifier le logo dans l’interface
avec une partie fictive. `scripts/review-chest.html` permet d’inspecter sa
présentation sur le coffre sans ouvrir de boîte réelle. Le paramètre
`theme=dark` active le mode nuit dans les aperçus studio et ouverture, sans
modifier la partie.
