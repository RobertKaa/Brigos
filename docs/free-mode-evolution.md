# Conception de la galerie du mode Libre

La V1 est désormais intégrée localement au jeu : `#sandbox` ouvre Ma galerie,
avec les projets existants, l’exposition, la présentation et la vedette.
Les règles mises en œuvre sont décrites dans [le mode Libre](sandbox.md), avec
la migration v11. La maquette séparée reste une exploration de V1.1 ; les défis
restent à développer. La communauté est maintenant intégrée localement dans un
ticket séparé : voir [les profils et galeries partagées](community.md). La migration Supabase est appliquée depuis le 18 octobre 2026 ;
la publication de l’interface et du moteur v11 est autorisée.

Le mode Libre permettra de terminer une création, de la présenter dans une galerie personnelle et de débloquer des éléments de présentation grâce à des défis facultatifs. La galerie donne une destination aux projets ; les défis donnent des occasions de construire avec le stock disponible.

Cette conception répond au [ticket Trello](https://trello.com/c/YjNw6RnO). Elle prépare les développements suivants. La [maquette interactive](../scripts/review-free-gallery.html) utilise uniquement des projets fictifs en mémoire et n’accède pas à la sauvegarde du joueur.

## Premier lot et étapes suivantes

| Lot                    | Résultat pour le joueur                                                                                      | Dépendances et limite                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| V1 Galerie personnelle | Exposer un projet, choisir sa présentation, le consulter, le mettre en vedette et reprendre sa construction. | Métadonnées persistées, migration et commandes invité/compte. Aucun compte nécessaire pour la galerie locale. |
| V1.1 Défis créatifs    | Trois défis permanents donnent trois éléments cosmétiques uniques.                                           | Galerie V1 et registre de récompenses atomique. Aucun revenu de monnaie, XP ou Brigos.                        |
| V2 Partage volontaire  | Présenter une copie de consultation à d’autres personnes et visiter une exposition.                          | Publication serveur, consentement, retrait, signalement et modération. Implémenté localement ; migration Supabase appliquée le 18 octobre 2026.          |

La maquette montre V1 et V1.1 pour vérifier leur cohérence. La V1 est intégrée localement avec les fonds de base. Les déblocages seront introduits avec V1.1. Les cinq destinations principales restent Boîtes / Atelier / Libre / Collection / Quêtes ; ces nouvelles vues appartiennent à Libre.

## Parcours et hiérarchie

Libre s’ouvre sur Ma galerie et conserve l’accès à Construire. Reprendre ouvre le projet choisi ; une nouvelle visite depuis la navigation principale retrouve la galerie. Les changements de vue placent le focus au titre. Les onglets sont des liens ordinaires avec `aria-current`. Défis sera ajouté avec V1.1.

| Situation                 | Information en premier                                      | Action principale et suite                                                                             |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Aucun projet              | Une invitation à construire avec son stock.                 | Créer une construction. Si le stock est vide, lien vers Boîtes ou les gains accessibles depuis Quêtes. |
| Projet vide               | « Ajoutez au moins un Brigo pour exposer cette création. »  | Reprendre la construction. L’exposition ne dépense rien.                                               |
| Projet non exposé         | Aperçu du projet et état « En construction ».               | Exposer, puis choisir titre, description, angle et fond.                                               |
| Galerie vide              | « Votre première création mérite sa place ici. »            | Choisir une création existante ; sinon créer un projet.                                                |
| Galerie remplie           | Création en vedette, puis toutes les expositions.           | Ouvrir une création. Exposer une autre création reste accessible.                                      |
| Fiche d’exposition        | Grand aperçu, titre, description et nombre de Brigos.       | Reprendre la construction. Présentation, vedette et retrait viennent ensuite.                          |
| Présentation à actualiser | « Cette création a changé depuis sa dernière exposition. »  | Actualiser la présentation. Les défis sont réévalués seulement lors de cette confirmation.             |
| Défi incomplet            | Les contraintes exactes et la progression du projet choisi. | Reprendre cette création ou en commencer une autre.                                                    |
| Défi rempli               | Le décor à débloquer et le résultat des critères.           | Exposer ou actualiser, puis afficher le déblocage confirmé.                                            |

Exposer ouvre un dialogue avec un aperçu et quatre champs : titre de 1 à 48 caractères, description facultative de 240 caractères, angle parmi quatre quarts de tour et fond. Le titre reprend le nom du projet et reste lié à celui-ci : le changer renomme le projet, sans second nom concurrent. Le cadrage est automatique, centré sur l’enveloppe réelle. Les deux fonds de base, Papier et Nuit d’encre, sont disponibles sans défi.

Une validation réussie ouvre la fiche et annonce « Création ajoutée à votre galerie ». Un échec conserve tous les champs et le projet. Fermer ou annuler ne modifie rien. Le bouton de confirmation reste désactivé pendant l’enregistrement ; le dialogue peut être fermé avec Échap et rend le focus à son déclencheur. Dans le jeu final, les messages de succès suivent la réponse de `game.act`.

Sur desktop, la galerie comporte deux à trois cartes par ligne ; une fiche occupe une page avec retour, plutôt qu’une petite modale dans la modale d’exposition. À 390 et 320 px, les cartes et les actions sont sur une colonne. Le dialogue s’adapte à la hauteur disponible et défile à l’intérieur ; ses champs restent avant sa confirmation. Les cibles font au moins 44 px, le focus est visible, le texte reste lisible dans les thèmes clair et sombre et aucune rotation automatique n’est lancée. Le bas du contenu garde la place de la navigation mobile.

## Règles des expositions

Une exposition référence un identifiant de projet existant. Un projet possède au plus une exposition et une galerie contient au plus 20 expositions, comme la limite actuelle de projets. Mettre en vedette remplace la précédente vedette en une seule action. Retirer une exposition conserve le projet et son stock réservé ; la vedette devient vide si l’exposition retirée était sélectionnée. Une nouvelle vedette n’est jamais choisie automatiquement.

L’exposition suit la construction actuelle. Une pose, un retrait, un déplacement ou une rotation de pièce change son empreinte géométrique et affiche l’état « À actualiser ». L’ancienne présentation n’est pas un second modèle caché : à la consultation, la géométrie actuelle est affichée avec cet état. Une simple modification du nom ou du décor ne change pas l’empreinte. Actualiser confirme l’empreinte actuelle et réévalue les défis ; ouvrir la fiche ne valide rien.

Un projet devenu vide est retiré de la galerie dans la transaction qui retire sa dernière pièce. Son identité de projet reste conservée. Démonter un projet retire son exposition et sa vedette dans la même transaction que la restitution exacte de ses Brigos. Si la restitution dépasse une capacité, l’ensemble échoue et la galerie reste inchangée. Le dialogue de démontage annonce la restitution et le retrait de la galerie. Les décors débloqués restent acquis.

Exposer, masquer, changer le fond, choisir l’angle et mettre en vedette ne touchent ni aux références réservées, ni à l’inventaire, ni aux revenus, ni à l’XP. L’angle agit seulement sur la présentation ; il ne tourne aucun placement. Les coordonnées 24 × 24 × 36, la limite de 500 Brigos par projet et les identifiants existants restent inchangés.

## Défis et récompenses du lot V1.1

Les trois défis sont permanents, indépendants et réalisables dans n’importe quel ordre. Le titre donne une idée, les critères expliquent exactement ce que le jeu mesure. Aucune reconnaissance d’animal, véhicule ou qualité artistique n’est annoncée. Le joueur peut interpréter le thème librement.

| Identifiant stable    | Inspiration et critères mesurés sur une création exposée                                                            | Récompense unique                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `gallery-miniature-1` | Petit monde : de 2 à 12 Brigos, emprise totale au plus 6 × 6 unités et hauteur totale au plus 12.                   | Socle Sable et badge Miniaturiste.            |
| `gallery-palette-1`   | Jardin de couleurs : au moins 3 Brigos et 2 couleurs distinctes. Aucune référence ou couleur précise n’est imposée. | Fond Aurore et badge Coloriste.               |
| `gallery-height-1`    | Signal dans le ciel : de 3 à 30 Brigos, emprise au plus 8 × 8 et hauteur totale d’au moins 9 unités.                | Cadre Encre et badge Architecte des hauteurs. |

L’emprise utilise les enveloppes réelles des pièces après rotation, du minimum au maximum des coordonnées. La hauteur totale est `max(z + hauteur de la pièce) - min(z)` : déplacer une seule pièce très haut ne simule donc pas une tour. Le système autorise déjà les pièces flottantes ; le défi ne certifie pas leur stabilité. Les pièces de collection réservées ailleurs ne sont pas disponibles pour ces projets.

Une création peut valider plusieurs défis lors d’une même exposition ; réutiliser un projet pour un autre défi reste permis. Chaque identifiant de défi ne se réclame qu’une fois par partie. Les marqueurs sont conservés après retrait, démontage ou changement de nom. Les trois récompenses donnent six objets de présentation au total, sans monnaie, XP, ouverture de boîte, bonus de production ou compteur quotidien. Les fonds de base restent accessibles même sans participation.

L’action Exposer ou Actualiser recalcule les critères depuis le projet courant, puis enregistre ensemble l’exposition, les nouveaux marqueurs et leurs déblocages. Les identifiants d’objets débloqués sont dérivés du catalogue fixe des défis et de leurs marqueurs ; le client ne fournit jamais une liste arbitraire de récompenses. Une seconde action, un double clic, une réponse rejouée ou deux onglets concurrents ne débloquent rien de plus. Aucun timer ni jour consécutif n’intervient.

## Extension de la sauvegarde pour les défis

La V1 utilise le schéma v11 décrit dans [les migrations](save-migrations.md). Une version suivante pourra étendre `freeGallery` avec les déblocages et leurs marqueurs. La structure ci-dessous est la cible envisagée pour V1.1 ; elle ne décrit pas le schéma v11 actuel :

```ts
{
  exhibits: Array<{
    projectId: string;
    description: string;
    rotation: 0 | 90 | 180 | 270;
    backgroundId: "paper" | "ink" | "aurora";
    baseId: "plain" | "sand";
    frameId: "plain" | "ink";
    confirmedGeometry: string;
  }>;
  featuredProjectId: string | null;
  claimedChallenges: string[];
}
```

Les dates ne conditionnent aucune récompense et ne sont pas nécessaires à ce schéma. `confirmedGeometry` est une empreinte déterministe versionnée des références, coordonnées et rotations, sans identifiant de placement ni ordre du tableau. Elle détecte un changement, mais ne prouve ni l’originalité ni l’authenticité du contenu. Un retour à une géométrie identique n’accorde aucune nouvelle récompense.

Le parseur borne la galerie à 20 références uniques vers des projets non vides, vérifie les identifiants de décor, les marqueurs connus sans doublons, les longueurs, caractères de contrôle et angles. Une vedette doit référencer une exposition. Un objet cosmétique verrouillé est refusé. Les formats v10 et antérieurs reçoivent une galerie vide sans récompense rétroactive ; un ancien format comportant déjà des marqueurs non vides du nouveau format est refusé. Les anciens lecteurs refusent la nouvelle version pour éviter la perte des marqueurs.

La migration depuis v11 conservera aussi les expositions et la vedette existantes ; les marqueurs de défis commenceront vides, sans validation automatique des anciens projets. Elle conserve exactement projets, stock, plans assemblés, monnaies, XP, production, quêtes et préférences et sera persistée une seule fois avec la révision existante. Les actions Exposer/Actualiser, Retirer de la galerie et Mettre/Retirer en vedette existent dans la V1. Le changement de nom réutilise sa validation existante dans la transaction d’exposition. Les opérations de retrait de pièce et de démontage nettoient les références d’exposition dans leur transaction actuelle.

Pour un compte, ces commandes passent par la même validation serveur et le même contrôle de révision que les autres actions. Une réponse obsolète actualise l’interface sans rejouer le gain. Un visiteur garde sa galerie dans sa sauvegarde locale. La création d’un compte conserve le fonctionnement actuel de sauvegardes distinctes, sans transfert automatique. L’export/import inclut le nouveau champ ; remplacer une sauvegarde remplace aussi sa galerie et ses marqueurs. Un fichier local modifié reste modifiable par son propriétaire : les récompenses étant cosmétiques et privées, aucune garantie de compétition n’est promise.

## Rendu et sécurité

Les aperçus reprennent les maillages et raccords losange Brigos existants. Les socles sont des éléments de présentation extérieurs au projet ; ils ne réservent pas de Brigos et ne participent pas aux collisions. Papier, Nuit d’encre, Aurore et Encre sont des aplats ou motifs originaux locaux, sans asset de tiers ni logo ajouté.

La grille finale utilise des images locales aplaties, générées à la demande et réutilisées par empreinte géométrie/angle/décor/version du dessin. Un cache mémoire borné, par exemple 20 aperçus et 16 Mio, révoque ses URL à l’éviction et à la fermeture. Les aperçus ne sont pas des pièces de la sauvegarde. Un échec de génération laisse un aperçu de secours et le titre ; il n’empêche ni d’ouvrir le projet ni de modifier sa présentation. La 3D détaillée reste chargée à la demande, rendue seulement après interaction et libérée à la sortie. La maquette se limite à deux petits projets et dessine directement leurs formes pour l’esquisse.

Les noms et descriptions restent du texte échappé. Aucun HTML, script, URL d’image libre ou contenu distant n’est accepté. Les objets JSON sont reconstruits à partir des champs autorisés ; aucune fusion arbitraire de propriétés. Les commandes serveur vérifient la propriété du projet et les limites indépendamment des contrôles de l’interface. La galerie personnelle ne déclenche aucune publication ou requête analytique.

## Partage communautaire V2

Le lot communautaire est implémenté localement : annuaire, profils, copies publiées, consentement, retrait et signalements. Les règles et la procédure de modération actuelles sont décrites dans [community.md](community.md). Les paragraphes suivants conservent l’intention initiale ; la demande de suppression du compte reste un parcours distinct.

Le partage demandera une action explicite et un aperçu de ce qui sera rendu public : pseudo choisi, titre, description et image ou copie des placements. Aucune coordonnée personnelle ni sauvegarde complète ne sera exposée. La copie publiée aura une version figée, indépendante des modifications du projet ; elle sera consultable sans permettre de récupérer des Brigos. Démonter le projet ne créera aucune ressource chez les visiteurs.

Le propriétaire pourra retirer sa publication et demander la suppression de ses données. Prévoir le périmètre et le délai de révocation, y compris le cache des images. Ajouter signalement, modération, limites d’envoi, contrôle des textes, traitement des contenus de tiers et politique de conservation avant l’ouverture. Les visiteurs ne pourront pas importer automatiquement les placements comme un plan récompensé. Les réactions éventuelles resteront sociales, sans revenu ni récompense liée à la popularité.

## Découpage de développement et critères de sortie

| Étape             | Développement                                                          | Sortie mesurable                                                                                                              |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A Intégrité V1    | Schéma, migration, commandes, référence au projet et nettoyage.        | Export/import de 20 projets × 500 placements sans changement de stock ; migration répétée sans effet ; retrait atomique.      |
| B Présentation V1 | Galerie, fiche, dialogue, vedette et aperçus bornés.                   | Parcours complet au clavier et tactile, 320/390 px sans débordement, aucune boucle GPU au repos ; état vide et erreur testés. |
| C Défis V1.1      | Critères, trois marqueurs et six déblocages cosmétiques.               | Une validation maximum par défi, concurrence et rejeu couverts ; économie et quêtes inchangées.                               |
| D Communauté V2   | Profils, annuaire, publication volontaire et modération. | Consentement, retrait, signalement, règles d’originalité et sécurité définis avant publication.                               |

A et B constituent la V1 intégrée localement. C dépend de leur validation et reste à développer. D est intégré localement par le [ticket des galeries de joueurs](https://trello.com/c/i7pgDeae), avec migration Supabase appliquée et publication autorisée. La maquette séparée reste une exploration de C.

## Vérifications prévues pour le développement

- TU métier : bornes exactes des trois défis, couleurs et rotations, translation verticale, critères identiques quel que soit l’ordre des placements, aucune reconnaissance sémantique implicite.
- TU d’intégrité : aucune variation des pièces ou gains sur exposition/vedette/retrait ; dernière pièce et démontage ; refus complet sur capacité dépassée ; cosmétique verrouillé et projet d’un autre compte refusés.
- Sauvegardes : migration v10 idempotente, formats historiques, ancien client, noms malveillants, doublons, références manquantes, limites, import/export maximal et deux onglets concurrents.
- Récompenses : transaction unique, double clic, rejeu serveur, actualisation, changement de nom, retrait/réexposition et démontage sans deuxième déblocage.
- UI : parcours Construire → Exposer → Galerie → Fiche → Reprendre ; annulation, erreur conservant la saisie, retour du focus, Échap, thèmes clair/sombre, zoom texte 200 %, 320/390 px et réduction des animations.
- Performance : 20 projets de 500 placements, budget de cache respecté, aucune scène 3D par carte, ressources libérées à la sortie et vue de secours.

Avant livraison fonctionnelle : `npm test`, `npm run check`, `npm run build`, puis les parcours concernés sur desktop et mobile, selon les consignes du projet. Les vérifications de la présente maquette sont consignées dans le commentaire de livraison du ticket.
