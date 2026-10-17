# Bibliothèque de constructions v0.7

La bibliothèque passe de 45 à 65 plans. Vingt nouveaux modèles relient les
petits assemblages aux monuments légendaires, avec plusieurs étapes de taille
et quatre thèmes : lieux, nature, objets et véhicules.

## Nouveaux lieux

| Construction                  | Brigos | Difficulté |
| ----------------------------- | -----: | ---------- |
| Le pavillon des plantes       |     62 | Créatif    |
| Le phare du port              |    104 | Créatif    |
| L’observatoire des étoiles    |    142 | Expert     |
| La gare des voyageurs         |    238 | Expert     |
| La librairie des arcades      |    257 | Expert     |
| La villa des jardins          |    369 | Expert     |
| La porte des saisons          |    389 | Expert     |
| Le musée des découvertes      |    416 | Expert     |
| Le fort du cap                |    659 | Expert     |
| Le théâtre des quatre saisons |    794 | Expert     |

## Nature, objets et véhicules

| Construction                 | Brigos | Thème     | Difficulté |
| ---------------------------- | -----: | --------- | ---------- |
| La fontaine des nénuphars    |     70 | Nature    | Créatif    |
| L’orgue à sept registres     |    129 | Objets    | Créatif    |
| La navette des confins       |    141 | Véhicules | Expert     |
| La goélette du grand large   |    142 | Véhicules | Expert     |
| La cascade des rochers       |    198 | Nature    | Expert     |
| Le piano de concert          |    324 | Objets    | Expert     |
| Le grand échiquier           |    349 | Objets    | Expert     |
| Le jardin des quatre saisons |    373 | Nature    | Expert     |
| Le terminal des marées       |    458 | Véhicules | Expert     |
| La serre des tropiques       |    604 | Nature    | Expert     |

## Choisir et parcourir les plans

- **Petits plans** : moins de 50 Brigos.
- **Projets intermédiaires** : de 50 à 899 Brigos.
- **Constructions légendaires** : au moins 900 Brigos, ou difficulté
  légendaire explicitement déclarée. Les trois monuments existants conservent
  leurs 915, 2 235 et 3 545 pièces.

Le format décrit la taille ; il reste indépendant de la difficulté. Les
filtres de thème, de difficulté et de format se combinent avec une recherche
insensible aux accents. Le tri s’applique à tous les résultats avant de les
découper en pages.

La bibliothèque et « Mes créations » affichent douze cartes par page, avec
navigation en haut et en bas. Sur desktop, la page active est indiquée dans
les numéros ; sur mobile, un sélecteur remplace les numéros pour conserver des
commandes tactiles suffisamment grandes. Changer de page place le focus sur
le titre des résultats et le ramène sous la navigation fixe. La préférence
de réduction des animations est respectée.

Recherche, filtre ou tri remettent les plans à la page 1. Si l’inventaire,
l’objectif ou la galerie changent, la page est recalée sur une page existante.
Les résultats vides sont annoncés et proposent une réinitialisation. Plusieurs
exemplaires d’une même construction gardent leur propre place dans la galerie.

## Cohérence des assemblages et de la progression

Les quantités proviennent des placements utilisés par le dessin et par le
lecteur de montage. Les longues briques et grandes plaques servent aux murs,
planchers et socles ; les petites pièces restent réservées aux détails. Aucun
modèle ni couleur supplémentaire n’est nécessaire.

Chaque nouveau plan passe les validations de collisions, d’attaches, de
connectivité et d’ordre de montage. Les silhouettes sont examinées dans les
quatre orientations. Ces contrôles géométriques ne simulent pas la résistance
des matériaux ou l’équilibre mécanique d’un objet réel.

L’XP conserve la règle existante : base liée à la difficulté plus 2 XP par
pièce, uniquement tant que la création est assemblée. Les tests construisent,
exportent, réimportent puis démontent chacun des nouveaux modèles : les
références exactes sont restituées et toute son XP est retirée.

Les quarante-cinq plans précédents restent inchangés. Leurs empreintes figées
avant les ajouts et le rechargement d’une galerie v5 sont vérifiés par les
tests. La sauvegarde reste v5 / `planRevision: 1`, sans migration ni
remboursement. Voir les [règles de compatibilité](save-migrations.md).

## Vérification de l’interface

L’aperçu de développement `scripts/review-studio.html?gallery=25#workshop`
utilise des données fictives et neutralise les actions de jeu. Il permet de
vérifier les filtres et la pagination sans lire ou modifier la partie du
joueur. Il reste hors du build de production.

Contrôles réalisés sur l’aperçu indépendant :

- Desktop 1 280 px : six pages pour 65 plans ; cinq cartes sur la dernière.
  Le filtre intermédiaire affiche douze cartes, puis huit sur sa seconde page.
- Filtres intermédiaire et nature combinés : quatre résultats, correctement
  triés par XP décroissante. Une recherche vide de résultat est annoncée par
  la région live du compteur.
- Mobile 390 et 320 px : aucun débordement horizontal, commandes de
  pagination de 44 px, sélection de page et focus du titre sous l’en-tête.
- Galerie fictive de 25 créations : douze, douze puis une carte sur trois
  pages, sans fusion des exemplaires.
- Suite complète : **955 tests dans 23 fichiers**. Build de production et
  TypeScript validés ; audit npm sans vulnérabilité signalée.

Captures de contrôle : `.artifacts/brigo-v07-library-desktop.png` et
`.artifacts/brigo-v07-library-mobile.png`. Les planches des quatre orientations
des nouveaux modèles se trouvent dans `.artifacts/intermediate-architecture/`
et `.artifacts/intermediate-worlds/`.
