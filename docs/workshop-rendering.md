# Rendu des constructions Brigos

Les aperçus de bibliothèque doivent rester fluides même sur mobile et pour les monuments. Ils utilisent une image du modèle préparée à l’avance, accompagnée d’un décor vectoriel léger. Ne pas réintroduire le dessin de chaque pièce dans toutes les cartes de l’atelier.

## Diagnostic du 15 octobre 2026

Sur l’aperçu indépendant `scripts/review-studio.html?theme=dark#workshop`, avant optimisation :

| Sélection                   | Cartes | Tracés SVG dans `.recipe-grid` | Éléments dans `.recipe-grid` |
| --------------------------- | -----: | -----------------------------: | ---------------------------: |
| Constructions légendaires   |      3 |                         51 587 |                       58 366 |
| Première page intermédiaire |     12 |                         19 323 |                       21 635 |

Chaque pièce ajoutait plusieurs faces, raccords et hachures au DOM. Le navigateur devait les créer, calculer leurs styles et les repeindre pendant le défilement. La préparation comparait aussi toutes les paires de pièces pour l’ordre d’affichage.

## Contrat de l’interface

- `ConstructionArt` en qualité `preview` pour les cartes, l’objectif suivi, la galerie et la vue d’ensemble d’une fiche.
- Une vue d’ensemble omet `step` pour afficher son environnement. Les étapes restent explicites, y compris la dernière, et conservent un fond dégagé.
- Les lecteurs de plus de 80 pièces utilisent aussi un dessin aplati pour éviter de reconstruire des milliers de nœuds pendant le montage. Les formes, couleurs et ordre des pièces proviennent toujours du même plan.
- Les fiches de plus de 80 pièces proposent un zoom pour inspecter les détails ; les lots restent réservés aux plans de plus de 180 pièces.
- Le thème agit sur le décor vectoriel ; le modèle conserve ses couleurs. Les images préparées ont un fond transparent.
- Aucun effet de flou ou `drop-shadow` supplémentaire sur les constructions de l’atelier. Leur ombre de contact fait partie du dessin.

Les changements de rendu et de décor ne modifient ni les recettes, ni les références de pièces, ni les sauvegardes. Le nom public est **Brigos** ; les anciennes clés techniques de stockage restent stables.

## Profondeur aux raccords

Le tri entre pièces considère ensemble les trois axes qui se rapprochent de la caméra. Un plan séparateur ne décide l’ordre que si aucun autre axe ne donne le sens contraire : des séparations contradictoires ne peuvent partager un même rayon de vue, même si leurs rectangles projetés se chevauchent. Donner systématiquement priorité à la hauteur créait un faux cycle entre la porte haute et les rangs de mur voisins de la maison corail. Les contraintes d’empilement sur une même emprise restent prioritaires.

Les dépendances d’empilement font aussi partie du graphe qui décide quelles pièces sont prêtes à être peintes, même si leurs silhouettes projetées ne se touchent pas. Un support masqué par une découpe ne doit pas déclencher le traitement des cycles et casser un autre raccord ailleurs dans la scène. Ces arêtes ne sont ajoutées qu’une fois et réutilisent les mêmes candidats spatiaux et compteurs de préfixe.

Les tests de raccord contrôlent la dernière surface peinte sur les trois niveaux de mur de la maison, les permutations et préfixes des volumes voisins dans quatre orientations, ainsi qu’une grande base et une plaque de toiture. La référence sans cache sert à vérifier le tri optimisé et ses préfixes ; elle ne constitue pas un oracle visuel. La planche `scripts/review-manga.html#assembly-inspector` permet une inspection des constructions avec leurs composants réels, sans lire la sauvegarde du joueur.

Revue du 16 octobre 2026 : 17 régressions dédiées aux raccords et aux dépendances de support, dont la maison, la fontaine des nénuphars, la gare, le fort et la citadelle. L’audit des contraintes séparatrices des 65 constructions dans quatre orientations, suivi d’un contrôle des régions effectivement peintes en cas de contradiction, n’a plus détecté d’erreur d’occlusion visible. Cela ne constitue pas une comparaison exhaustive de chaque pixel de tous les assemblages. Après régénération des 65 aperçus : 64 fichiers et 1 967 tests réussis, TypeScript et build réussis, audit npm sans vulnérabilité signalée. Les vues jour/nuit ont été contrôlées sur ordinateur et à 390 et 320 px.

## Revue

Vérifier les filtres intermédiaires et légendaires, la galerie, l’ouverture d’une fiche, les quatre orientations, les étapes 0 / 1 / fin, les lots, le zoom et le changement jour/nuit. Utiliser l’aperçu sans sauvegarde pour les actions de test. Le profil React de cette page distingue le rendu de l’atelier et celui de la fiche ; il ne mesure pas le décodage des images ni le GPU.

Les décors sont des illustrations originales du projet, soumises à [la règle d’originalité](originality-policy.md). Ils doivent enrichir la silhouette sans dissimuler ses pièces.

## Images préparées et génération

`src/components/construction-previews.json` référence les 72 images transparentes dans `public/constructions`. Elles montrent uniquement les pièces ; le décor et l’ombre de contact restent vectoriels et réagissent au thème. La dimension maximale est 896 px pour les plans de 50 pièces ou moins, et 1 024 px au-delà, en WebP qualité 88 : 4,66 Mio au total, sous le budget de 5 Mio. Aucune bibliothèque de conversion n’est chargée dans le navigateur.

Pour régénérer après une modification des formes, couleurs, angles ou plans :

```powershell
# Avec sharp installé et accessible à Node :
node scripts/export-construction-previews.mjs

# Ou indiquer le chemin d’un module sharp déjà installé :
$env:BRIGO_SHARP_PATH = 'C:\chemin\vers\node_modules\sharp'
node scripts/export-construction-previews.mjs
```

Le script utilise Vite en mode middleware sans ouvrir de port, sans lire ni modifier de sauvegarde. Il réutilise les images dont l’empreinte et la résolution sont à jour, régénère les autres plans, écrit le manifeste puis supprime seulement les anciens WebP portant le nom de fichier généré avec empreinte de contenu. Chaque entrée contient une empreinte des placements, modèles, couleurs et de la version du dessin. Incrémenter `CONSTRUCTION_RENDERER_VERSION` dans `BrigoScene.tsx` lorsque les règles de dessin changent, puis régénérer. Les tests vérifient la couverture complète, les empreintes, les fichiers WebP avec transparence et le budget total de 5 Mio. Un aperçu obsolète utilise automatiquement le dessin courant.

## Calculs et limites mémoire

Les rotations, variantes personnelles et étapes intermédiaires utilisent une image SVG locale. Ses symboles réutilisent chaque maillage répété au lieu de recopier tous ses tracés. Le document principal ne reçoit qu’un élément `image` pour la construction. Le dessin conserve chaque placement, la couleur attribuée et l’ordre exact de l’étape ; aucune pièce n’est supprimée par une approximation du modèle.

Les caches sont en mémoire uniquement et bornés : 128 maillages / 40 000 primitives, 4 scènes / 9 000 pièces et 16 images SVG / 8 millions de caractères (environ 16 Mo en UTF-16). Chaque scène garde au plus quatre préfixes d’étapes. Une grille spatiale élimine les comparaisons de pièces éloignées avant les règles exactes de tri. Pour les petits plans, le changement d’étape filtre les raccords masqués sans recréer tous les volumes.

Mesures locales comparables dans Node/Vite, sur la citadelle de 3 545 pièces : préparation complète de 202 à 68 ms ; rendu serveur d’un aperçu de 443 à 9,2 ms au premier appel, puis environ 0,8 ms. Le balisage de cette construction passe de 25 784 tracés / 5,63 Mo à 11 tracés de décor / 2,8 Ko. Une étape de 3 544 pièces se sérialise en environ 7 ms / 245 Ko grâce aux symboles réutilisés. Ce sont des mesures indicatives du calcul et du balisage, pas une promesse de fréquence d’affichage sur chaque appareil.

## Résultat vérifié dans le navigateur

Après optimisation, dans la même grille à 1 280 px :

| Sélection                   | Cartes | Tracés SVG | Éléments DOM | Images préparées |
| --------------------------- | -----: | ---------: | -----------: | ---------------: |
| Constructions légendaires   |      3 |         66 |          149 |                3 |
| Première page intermédiaire |     12 |        232 |          552 |               12 |

Les compteurs comprennent les petites icônes de la grille. Les modifications de filtre ont donné un rendu React de 14,9 ms ; cette mesure exclut le décodage et la composition graphique.

À 390 × 844 px, la grille passe sur une colonne et la fiche garde la même largeur de contenu et de défilement (339 px), sans débordement horizontal. L'étape 3 544 de la citadelle utilise une seule image, aucun tracé dans le DOM de la construction et un rendu React mesuré à 8,7 ms. Les étapes 0 et 1, le changement de lot, le retour à la vue d'ensemble, la rotation, le zoom d'un plan de 114 pièces et les thèmes clair et sombre ont été vérifiés sans accéder à la sauvegarde du joueur.

Validation de cette livraison : 35 fichiers de tests, 1 221 tests réussis ; vérification TypeScript et build de production réussis ; audit npm sans vulnérabilité signalée. Le build conserve l'avertissement de taille des chunks JavaScript.
