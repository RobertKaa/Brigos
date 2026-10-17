# Parcours Brigos

La navigation garde cinq destinations dans le même ordre sur ordinateur et mobile : **Boîtes, Atelier, Libre, Collection, Quêtes**. Le mode libre possède sa propre entrée ; il n’est plus signalé comme une page de l’Atelier. Le guide et les réglages sont accessibles dans l’en-tête, y compris sur petit écran. Les réglages sont visibles sans dérouler le guide.

## Actions prioritaires

- **Boîtes** : un seul comptoir pour comparer les trois boîtes, sélectionner et ouvrir. Le choix ne déclenche aucun déplacement de page. L’action distingue explicitement l’utilisation gratuite d’une réserve de l’achat suivi de l’ouverture. Le prix, le stock et les probabilités restent accessibles avant toute dépense.
- **Atelier** : Bibliothèque et Mes créations précèdent le contenu. Recherche et trois raccourcis restent visibles ; format, thème, difficulté et tri sont regroupés dans une section repliable. L’objectif suivi occupe une ligne compacte. Les statistiques de niveau et l’explication XP restent accessibles en bas.
- **Fiche d’un plan** : disponibilité et prochaine action en premier, puis aperçu et informations détaillées. Les étapes et la liste des pièces se consultent à la demande. Une commande ajoute les pièces ; l’assemblage reste une action distincte. Après un assemblage réussi, l’app ouvre Mes créations. Un échec conserve la fiche et le stock.
- **Collection** : Mes Brigos est la vue initiale, en comptant les exemplaires réservés dans les constructions et les projets libres. L’album complet, les découvertes manquantes et les doublons restent accessibles. Statistiques, tri et filtres avancés sont repliés.
- **Quêtes** : cadeau en premier, puis missions. Tout récupérer compose les récompenses éligibles dans un seul `game.act` ; le bonus est évalué après les trois missions. Circuit et passeport restent repliables, avec état visible. La récolte des constructions mène directement à Mes créations.

## Adresses et compatibilité

Les cinq anciennes adresses restent valides : `#boxes`, `#workshop`, `#sandbox`, `#collection`, `#journal`.

- `#workshop?view=built` ouvre Mes créations.
- `#workshop?view=ready` ouvre les plans prêts à construire.
- Les destinations et paramètres inconnus sont ignorés ou ramenés aux Boîtes ; aucun paramètre n’est injecté en HTML ou utilisé comme URL externe.

Cette refonte ne change aucun tarif, rendement, recette, identifiant, règle de stock ou format de sauvegarde. Les promotions et informations secondaires ne doivent pas repousser l’action principale sous plusieurs écrans.

## Vérification

`scripts/review-journeys.html` monte `GameApp` avec une partie en mémoire, sans monter `useGame` ni connecter de dépôt. Elle permet de vérifier sélection/ouverture/révélation, assemblage, récoltes et quêtes sans lire ou écrire la sauvegarde du joueur. `?empty=1` montre une nouvelle partie. Les actions utilisent les transformations et la validation réelles du jeu. La fixture est réservée au développement et n’est pas une entrée du build.

Contrôler les cinq destinations sur ordinateur, à 390 px et à 320 px, le retour du focus et Échap dans les modales, les états verrouillés et la réduction des animations. Préserver des cibles d’action d’au moins 44 px et l’espace de dégagement de la navigation mobile.
