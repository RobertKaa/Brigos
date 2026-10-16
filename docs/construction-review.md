# Revue des 65 constructions — v5 vers v6

La revue conserve les 65 identités publiées : **26 plans révisés** et **39 plans conservés**. La bibliothèque représente 13 643 Brigos en v5 et 13 503 Brigos après correction, pour un exemplaire de chaque plan. Les comptages viennent des exigences et correspondent exactement aux pièces placées.

Les plans marqués **Révisé** ont une géométrie ou une nomenclature différente. Lors de la migration v5→v6, leurs créations exposées sont démontées et leurs références exactes, couleurs comprises, sont restituées à l’inventaire. Les créations marquées **Conservé** restent exposées. L’XP est recalculée à partir de l’exposition restante ; les pièces de monnaie, boîtes, découvertes, récompenses déjà réclamées et ouvertures en cours sont préservées.

Les noms, descriptions, clés et ordre des pièces ne provoquent aucun démontage. Le réglage `previewRotation` change seulement la caméra initiale : il préserve également création, inventaire et XP. Les portes bénéficient d’une correction du rendu commun, notamment celles de la maison et du château, sans changement de leur assemblage.

La migration est enregistrée immédiatement dans une transaction IndexedDB ; plusieurs onglets ne doublent pas la restitution. Le switch unique `CURRENT_SAVE_VERSION` reste à 5 pendant l’intégration des fichiers, puis passe à 6 une fois la livraison complète. Les actions React attendent un état de la version active avant d’utiliser les plans revus.

| Plan | Brigos v5 | Brigos v6 | État | Revue visuelle |
| --- | ---: | ---: | --- | --- |
| Le petit totem (`totem`) | 5 | 5 | Conservé | Assemblage conservé après revue. |
| Le banc du parc (`bench`) | 7 | 7 | Conservé | Assemblage conservé après revue. |
| Mon beau sapin (`tree`) | 13 | 21 | Révisé | Trois couronnes radiales en volume, de 6 à 4 puis 2 tenons, terminées par une pointe d’un tenon ; les branches se resserrent autour du tronc. |
| La maison corail (`house`) | 13 | 13 | Conservé | Assemblage conservé ; sa porte bénéficie de la correction du rendu commun. |
| Le phare des Brigos (`lighthouse`) | 25 | 25 | Révisé | Piliers de lanterne décalés sur les côtés pour dégager la lumière, sans augmenter le nombre de pièces. |
| Brigobot (`robot`) | 16 | 16 | Conservé | Assemblage conservé après revue. |
| Le petit pont (`bridge`) | 10 | 10 | Conservé | Assemblage conservé après revue. |
| Le château des nuages (`castle`) | 39 | 39 | Conservé | Assemblage conservé ; sa porte bénéficie de la correction du rendu commun. |
| Le Brigosaurus (`dinosaur`) | 26 | 37 | Révisé | Quatre pattes portent un corps horizontal ; le cou dressé, la queue effilée et les yeux latéraux rendent le sauropode lisible. |
| Le café Soleil (`cafe`) | 25 | 25 | Conservé | Assemblage conservé après revue. |
| Le vaisseau d’exploration (`spaceship`) | 18 | 14 | Révisé | Nez allongé, ailes étagées symétriques, cockpit sombre et dérive arrière ; silhouette resserrée avec moins de pièces. |
| Le cœur pixel (`mosaic`) | 37 | 37 | Conservé | Assemblage conservé après revue. |
| Le champignon des bois (`mushroom`) | 19 | 14 | Révisé | Chapeau rond lissé et bombé, quatre pois clairs et pied élancé ; abandon du chapeau en gradins carrés. |
| La fleur du matin (`flower`) | 13 | 13 | Conservé | Assemblage conservé après revue. |
| Le manchot voyageur (`penguin`) | 26 | 28 | Révisé | Silhouette debout, ailes distinctes et yeux sur la face verticale claire, au-dessus du bec et des pieds orange. |
| Le canard Soleil (`duck`) | 12 | 16 | Révisé | Tête détachée du corps, yeux verticaux, bec saillant et dos profilé par des pentes. |
| La tortue des jardins (`turtle`) | 14 | 17 | Révisé | Carapace au-dessus de quatre pattes ; tête avancée et basse, yeux sur la face et petite queue. |
| Le bateau du canal (`boat`) | 13 | 13 | Révisé | Pentes de proue et de poupe alignées sur la longueur de la coque ; bleu cohérent sur la coque. |
| L’avion des couleurs (`airplane`) | 14 | 18 | Révisé | Fuselage de 2 × 10 tenons, envergure de 8, nez incliné vers l’avant et dérive verticale sur l’empennage arrière. |
| Le puits du village (`well`) | 16 | 16 | Conservé | Assemblage conservé après revue. |
| La boîte aux lettres (`mailbox`) | 11 | 14 | Révisé | Fente sombre visible sous le petit toit corail, au-dessus du pied graphite. |
| Le sablier doré (`hourglass`) | 20 | 27 | Révisé | Montants arrondis plus fins ; sable supérieur évasé de 1 à 3 puis 5 tenons, relié au volume inférieur par un goulot étroit. |
| La borne Pixel (`arcade`) | 19 | 19 | Conservé | Assemblage conservé après revue. |
| Le piano de minuit (`piano`) | 19 | 24 | Révisé | Véritable piano droit à caisse haute sur quatre pieds, six touches claires longues et trois touches noires plus courtes. |
| La bibliothèque arc-en-ciel (`library`) | 24 | 24 | Conservé | Assemblage conservé après revue. |
| Le jardin sous les arches (`greenhouse`) | 25 | 25 | Conservé | Assemblage conservé après revue. |
| La pagode des lanternes (`pagoda`) | 35 | 35 | Conservé | Assemblage conservé après revue. |
| Le chalet enneigé (`chalet`) | 18 | 18 | Conservé | Assemblage conservé après revue. |
| Le portail interstellaire (`spacegate`) | 25 | 25 | Conservé | Assemblage conservé après revue. |
| La petite chaise (`armchair`) | 8 | 8 | Conservé | Assemblage conservé après revue. |
| L’escalier des débutants (`pyramid`) | 6 | 6 | Conservé | Assemblage conservé après revue. |
| Le pont des débutants (`starter-bridge`) | 9 | 9 | Conservé | Assemblage conservé après revue. |
| Le cactus du désert (`cactus`) | 12 | 12 | Conservé | Assemblage conservé après revue. |
| Le bonhomme de neige (`snowman`) | 13 | 17 | Révisé | Yeux placés sur la face verticale et chapeau détaché de la silhouette blanche ; nez et écharpe restent visibles. |
| Le hibou Noisette (`owl`) | 24 | 27 | Révisé | Face claire à grands yeux sombres, bec central et deux aigrettes pointues ; regard lisible sur la face verticale. |
| La tasse du matin (`cup`) | 5 | 26 | Révisé | Tasse carrée remplie de café, avec une vraie anse en boucle verticale reliée au bord et au pied. |
| La table du goûter (`table`) | 12 | 12 | Conservé | Assemblage conservé après revue. |
| Le lampadaire du square (`streetlamp`) | 12 | 12 | Conservé | Assemblage conservé après revue. |
| La porte du jardin (`torii`) | 15 | 15 | Conservé | Assemblage conservé après revue. |
| La fontaine du jardin (`fountain`) | 19 | 19 | Conservé | Assemblage conservé après revue. |
| L’aqueduc des trois arches (`aqueduct`) | 22 | 22 | Conservé | Assemblage conservé après revue. |
| Le voilier de la baie (`sailboat`) | 16 | 24 | Révisé | Voile triangulaire haute à quatre rangs et bord diagonal ; les plaques relient réellement chaque rang au mât. |
| Les jardins d’Astréval (`astreval-gardens`) | 915 | 915 | Conservé | Assemblage conservé après revue. |
| Le palais des aurores (`aurora-palace`) | 2 235 | 2 235 | Conservé | Assemblage conservé après revue. |
| La citadelle des huit tours (`high-citadel`) | 3 545 | 3 545 | Conservé | Assemblage conservé après revue. |
| Le pavillon des plantes (`winter-garden`) | 62 | 62 | Conservé | Assemblage conservé après revue. |
| Le phare du port (`harbour-lighthouse`) | 104 | 114 | Révisé | Lanterne haute de 12 unités plaque, piliers latéraux et toit pyramidal réalisé avec des pièces actives. |
| L’observatoire des étoiles (`star-observatory`) | 142 | 136 | Révisé | Coupole arrondie et télescope horizontal supporté, avec objectif bleu distinct au sommet de l’observatoire. |
| La gare des voyageurs (`travellers-station`) | 238 | 248 | Révisé | Horloge construite en mosaïque sur les deux faces du pavillon, au-dessus du faîtage de la gare. |
| La librairie des arcades (`arcade-bookshop`) | 257 | 257 | Conservé | Assemblage conservé après revue. |
| La villa des jardins (`garden-villa`) | 369 | 369 | Conservé | Assemblage conservé après revue. |
| Le musée des découvertes (`discovery-museum`) | 416 | 416 | Conservé | Assemblage conservé après revue. |
| La porte des saisons (`season-gate`) | 389 | 389 | Conservé | Assemblage conservé après revue. |
| Le théâtre des quatre saisons (`four-seasons-theatre`) | 794 | 794 | Conservé | Assemblage conservé après revue. |
| Le fort du cap (`cape-fort`) | 659 | 531 | Révisé | Quatre tours à baies arquées remplacent les vitrages d’immeuble ; remparts crénelés et passage voûté préservent la silhouette fortifiée. |
| La fontaine des nénuphars (`waterlily-fountain`) | 70 | 70 | Conservé | Assemblage conservé après revue. |
| L’orgue à sept registres (`chamber-organ`) | 129 | 129 | Conservé | Assemblage conservé après revue. |
| La cascade des rochers (`terraced-waterfall`) | 198 | 223 | Révisé | Relief de pierre continu, trois chutes larges et fines séparées par des plans d’eau horizontaux et des lèvres d’écume ; bassin inférieur fleuri. |
| La navette des confins (`cargo-shuttle`) | 141 | 128 | Révisé | Coque et ailes resserrées autour d’un nez incliné, d’un cockpit sombre et de deux réacteurs ; vue initiale tournée pour lire l’avant. Caméra initiale : 180° ; ce réglage seul ne déclenche aucun démontage. |
| La goélette du grand large (`ocean-schooner`) | 142 | 163 | Révisé | Coque effilée et deux grandes voiles triangulaires ; les petites pentes lissent les diagonales de leurs bords. |
| Le grand échiquier (`grand-chessboard`) | 349 | 349 | Conservé | Assemblage conservé après revue. |
| Le piano de concert (`concert-grand-piano`) | 324 | 112 | Révisé | Piano à queue effilé sur trois pieds, clavier de dix touches, cordes dorées et couvercle ouvert sur le côté. |
| Le jardin des quatre saisons (`four-seasons-garden`) | 373 | 373 | Conservé | Assemblage conservé après revue. |
| Le terminal des marées (`cargo-harbor`) | 458 | 458 | Conservé | Assemblage conservé après revue. |
| La serre des tropiques (`tropical-conservatory`) | 604 | 683 | Révisé | Quatre fermes franchement inclinées reliées par un long faîtage ; plus de la moitié du toit reste ouverte pour voir les plantes. |

Les 65 plans du tableau passent les contrôles de collisions, d’attache sur tenons, de connectivité finale et d’ordre de montage. Les 65 instantanés historiques correspondent aux empreintes SHA256 complètes figées avant correction.

Ce rapport est généré par `node scripts/generate-construction-review.mjs` à partir du catalogue v6 et du snapshot v5 indépendant. Le script évalue les modules en SSR, sans ouvrir de serveur HTTP ni WebSocket, et refuse de produire le tableau si une identité, une empreinte, une nomenclature ou un assemblage est incohérent.
