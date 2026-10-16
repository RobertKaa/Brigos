# Correction visuelle du coffre

Contrôle du 9 octobre 2026.

Le couvercle tournait vers l’intérieur du coffre : le signe de la rotation était inversé pour sa charnière arrière. Son dessus et son dessous étaient également décalés par rapport aux tranches, laissant des raccords incohérents.

La rotation soulève maintenant l’avant vers le haut, autour de la charnière arrière. Les six faces forment un volume fermé de 15 px d’épaisseur : dessus à −15, dessous au niveau du bord, tranches entre les deux. Les faces orientées à l’opposé sont masquées. Les trois groupes du volume conservent `preserve-3d` sans filtre ni variation d’opacité sur leurs ancêtres communs.

La scène réserve suffisamment de hauteur au couvercle levé, sous le titre et au-dessus de la légende, sur desktop et mobile. Les derniers effets de briques et de poussière se terminent respectivement à 2 795 et 2 770 ms, avant le passage aux cartes à 2 800 ms.

## Vérifications

- Rendu réel inspecté fermé, pendant le soulèvement et ouvert avec l’aperçu `scripts/review-chest.html`, qui utilise le composant et les animations de production, en les mettant en pause à un instant choisi.
- Les trois types de boîtes contrôlés ; largeurs desktop, 390 et 320 px. Le couvercle ouvert reste dans la scène et sous le titre, sans débordement horizontal du contenu.
- Parcours de la vraie modale vérifié dans `scripts/review-opening.html`, avec des données fictives et sans accès à la partie : passage automatique aux dix cartes, passage manuel avec focus sur la première carte, et mode réduit sans coffre animé. Aucun débordement horizontal de la modale mobile.
- **977 tests passent** ; build TypeScript et Vite validé. Les règles de butin et de sauvegarde sont inchangées ; aucune dépendance ajoutée.
- Le nouvel aperçu exige le mode développement et reste hors du build de production. Il n’importe aucun hook de partie ni dépôt de sauvegarde.

Captures : `.artifacts/brigo-chest-before-closed.png`, `.artifacts/brigo-chest-corrected-desktop.png` et `.artifacts/brigo-chest-corrected-mobile.png`.
