import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

export const NATURE_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "tree",
    name: "Mon beau sapin",
    description:
      "Un tronc noisette porte trois étages de branches vertes de plus en plus étroites. Quatre bras en pente donnent du volume au feuillage autour du cœur central.",
    difficulty: "Créatif",
    color: "#e0eee4",
    placements: layout((p) => {
      p("plate-4x4", "ivory", 1, 1, 0);
      for (const z of [1, 4]) p("round-2x2", "brown", 2, 2, z);
      // Crossing bars overlap at the centre; no corner slabs imitate a roof.
      p("plate-2x6", "green", 0, 2, 7, 90);
      p("plate-2x6", "green", 2, 0, 8);
      for (const z of [9, 12]) p("brick-2x2", "green", 2, 2, z);
      p("slope-2x2", "green", 0, 2, 8, 180);
      p("slope-2x2", "green", 4, 2, 8);
      p("slope-2x2", "green", 2, 0, 9, 270);
      p("slope-2x2", "green", 2, 4, 9, 90);
      p("plate-2x4", "green", 1, 2, 15, 90);
      p("plate-2x4", "green", 2, 1, 16);
      p("brick-2x2", "green", 2, 2, 17);
      p("slope-1x2", "green", 1, 2, 16, 180);
      p("slope-1x2", "green", 4, 2, 16);
      p("slope-1x2", "green", 2, 1, 17, 270);
      p("slope-1x2", "green", 2, 4, 17, 90);
      p("plate-2x2", "green", 2, 2, 20);
      p("brick-1x1", "green", 2, 2, 21);
      p("slope-1x1", "green", 2, 2, 24, 180);
    }),
  },
  {
    id: "mushroom",
    name: "Le champignon des bois",
    description:
      "Un pied ivoire élancé et un chapeau rond corail, lissé et parsemé de quatre pois clairs.",
    difficulty: "Créatif",
    color: "#f5dedb",
    placements: layout((p) => {
      p("plate-4x4", "green", 0, 0, 0);
      for (const z of [1, 4, 7]) p("round-2x2", "ivory", 1, 1, z);
      p("round-4x4", "coral", 0, 0, 10);
      p("tile-2x2", "coral", 1, 1, 13);
      for (const [x, y] of [
        [1, 0],
        [3, 1],
        [0, 2],
        [2, 3],
      ])
        p("tile-1x1", "ivory", x, y, 13);
      for (const [x, y] of [
        [2, 0],
        [3, 2],
        [0, 1],
        [1, 3],
      ])
        p("tile-1x1", "coral", x, y, 13);
    }),
  },
  {
    id: "flower",
    name: "La fleur du matin",
    description:
      "Une tige verte, quatre pétales et un cœur corail dans un petit pot mandarine.",
    difficulty: "Créatif",
    color: "#f6eacb",
    placements: layout((p) => {
      p("plate-4x4", "brown", 0, 0, 0);
      for (const z of [1, 4]) p("round-2x2", "orange", 1, 1, z);
      p("plate-2x2", "orange", 1, 1, 7);
      for (const z of [8, 11, 14]) p("brick-1x1", "green", 1, 1, z);
      p("special-cross", "yellow", 0, 0, 17);
      for (const [x, y] of [
        [0, 1],
        [1, 0],
        [2, 1],
        [1, 2],
      ])
        p("tile-1x1", "yellow", x, y, 18);
      p("round-1x1", "coral", 1, 1, 18);
    }),
  },
  {
    id: "penguin",
    name: "Le manchot voyageur",
    description:
      "Un manchot debout : ventre blanc, ailes en pente, grands yeux sombres sur la face claire et bec au-dessus de deux pieds orange.",
    difficulty: "Créatif",
    color: "#e0eaf3",
    placements: layout((p) => {
      p("plate-6x6", "blue", 0, 0, 0);
      for (const x of [1, 4]) p("brick-1x3", "orange", x, 2, 1);
      p("plate-2x6", "charcoal", 0, 1, 4, 90);
      p("plate-1x4", "charcoal", 1, 3, 4, 90);
      for (const z of [5, 8, 11, 14]) {
        p("brick-2x4", "charcoal", 1, 1, z, 90);
        p("brick-1x4", "ivory", 1, 3, z, 90);
      }
      for (const x of [0, 5]) {
        for (const z of [5, 8]) p("brick-1x3", "charcoal", x, 1, z);
        p("slope-1x3", "charcoal", x, 1, 11, x === 0 ? 180 : 0);
      }
      p("plate-2x4", "ivory", 1, 2, 17, 90);
      p("brick-1x4", "charcoal", 1, 2, 18, 90);
      for (const x of [1, 4]) p("brick-1x1", "charcoal", x, 3, 18);
      p("plate-2x2", "orange", 2, 3, 18);
      for (const z of [19, 20]) p("plate-1x2", "ivory", 2, 3, z, 90);
      p("plate-2x4", "ivory", 1, 2, 21, 90);
      p("tile-2x4", "charcoal", 1, 2, 22, 90);
    }),
  },
  {
    id: "duck",
    name: "Le canard Soleil",
    description:
      "Un canard jaune à tête bien détachée, yeux sombres, bec orange saillant et dos arrondi par deux pentes.",
    difficulty: "Premiers pas",
    color: "#f8ecc5",
    placements: layout((p) => {
      p("plate-6x6", "blue", 0, 0, 0);
      p("plate-4x4", "yellow", 1, 1, 1);
      for (const y of [1, 3]) p("brick-2x4", "yellow", 1, y, 2, 90);
      for (const x of [1, 3]) p("slope-2x2", "yellow", x, 1, 5, 270);
      p("brick-2x4", "yellow", 1, 3, 5, 90);
      p("plate-2x3", "yellow", 2, 3, 8, 90);
      p("brick-1x3", "yellow", 2, 3, 9, 90);
      for (const x of [2, 4]) p("brick-1x1", "charcoal", x, 4, 9);
      p("plate-1x2", "orange", 3, 4, 9);
      for (const z of [10, 11]) p("plate-1x1", "yellow", 3, 4, z);
      p("plate-2x3", "yellow", 2, 3, 12, 90);
      p("tile-1x3", "yellow", 2, 4, 13, 90);
    }),
  },
  {
    id: "turtle",
    name: "La tortue des jardins",
    description:
      "Une carapace noisette au-dessus de quatre pattes, une tête verte avancée avec deux yeux sur sa face et une petite queue.",
    difficulty: "Créatif",
    color: "#dceade",
    placements: layout((p) => {
      p("plate-6x6", "blue", 0, 0, 0);
      for (const x of [1, 4])
        for (const y of [1, 4]) p("brick-1x1", "green", x, y, 1);
      p("plate-2x3", "green", 2, -1, 1, 90);
      p("brick-1x2", "green", 2, 4, 1);
      p("plate-4x4", "brown", 1, 1, 4);
      for (const y of [1, 3]) {
        p("slope-2x2", "brown", 1, y, 5, 180);
        p("slope-2x2", "brown", 3, y, 5);
      }
      p("brick-1x3", "green", 2, 0, 2, 90);
      for (const x of [2, 4]) p("brick-1x1", "charcoal", x, -1, 2);
      p("brick-1x1", "green", 3, -1, 2);
      p("plate-2x3", "green", 2, -1, 5, 90);
    }),
  },
  {
    id: "dinosaur",
    name: "Le Brigosaurus",
    description:
      "Un petit sauropode sur quatre pattes : corps horizontal, cou dressé, museau allongé et queue effilée qui prolonge le dos.",
    difficulty: "Expert",
    color: "#dcecd5",
    placements: layout((p) => {
      for (const x of [1, 6])
        for (const y of [1, 4]) {
          p("brick-1x2", "green", x, y, 0, 90);
          p("brick-1x1", "green", x === 1 ? 2 : 6, y, 3);
        }
      for (const y of [1, 3]) p("plate-2x8", "green", 0, y, 6, 90);
      for (const x of [0, 4]) p("brick-4x4", "green", x, 1, 7);
      for (const y of [1, 3]) p("plate-2x8", "green", 0, y, 10, 90);
      p("brick-2x6", "green", 1, 2, 11, 90);
      for (const x of [1, 4]) {
        p("slope-1x3", "green", x, 1, 11, 270);
        p("slope-1x3", "green", x, 4, 11, 90);
      }
      p("slope-1x2", "green", 7, 2, 11);
      for (const y of [1, 4]) {
        p("slope-1x1", "green", 0, y, 11, 180);
        p("slope-1x1", "green", 7, y, 11);
      }
      p("plate-2x4", "green", -3, 2, 11, 90);
      p("slope-2x2", "green", -3, 2, 12, 180);
      for (const x of [-1, 0]) p("brick-1x2", "green", x, 2, 12);
      for (const z of [14, 17, 20]) p("brick-2x2", "green", 6, 2, z);
      p("plate-2x4", "green", 6, 2, 23, 90);
      p("brick-1x2", "green", 6, 2, 24);
      for (const y of [2, 3]) p("brick-1x1", "charcoal", 7, y, 24);
      p("brick-2x2", "green", 8, 2, 24);
      p("plate-2x4", "green", 6, 2, 27, 90);
    }),
  },
  {
    id: "cactus",
    name: "Le cactus du désert",
    description:
      "Deux bras décalés et une tige verte dressée dans son pot noisette.",
    difficulty: "Premiers pas",
    color: "#e4edda",
    placements: layout((p) => {
      p("brick-2x2", "brown", 1, 1, 0);
      p("plate-2x2", "brown", 1, 1, 3);
      for (const z of [4, 7]) p("brick-1x1", "green", 1, 1, z);
      p("plate-1x3", "green", 0, 1, 10, 90);
      for (const z of [11, 14, 17]) p("brick-1x1", "green", 1, 1, z);
      p("round-1x1", "green", 0, 1, 11);
      p("brick-1x1", "green", 2, 1, 11);
      p("round-1x1", "green", 2, 1, 14);
      p("round-1x1", "green", 1, 1, 20);
    }),
  },
  {
    id: "snowman",
    name: "Le bonhomme de neige",
    description:
      "Une silhouette blanche, une écharpe mandarine, un nez orange et un chapeau graphite.",
    difficulty: "Créatif",
    color: "#e9eef3",
    placements: layout((p) => {
      p("plate-4x4", "blue", 0, 0, 0);
      for (const z of [1, 4]) p("round-4x4", "ivory", 0, 0, z);
      for (const z of [7, 10]) p("round-2x2", "ivory", 1, 1, z);
      p("plate-2x2", "orange", 1, 1, 13);
      for (const y of [1, 2]) p("brick-1x3", "ivory", 1, y, 14, 90);
      p("brick-1x3", "ivory", 1, 1, 17, 90);
      for (const x of [1, 3]) p("brick-1x1", "charcoal", x, 2, 17);
      p("plate-1x2", "orange", 2, 2, 17);
      for (const z of [18, 19]) p("plate-1x1", "ivory", 2, 2, z);
      p("plate-2x3", "ivory", 1, 1, 20, 90);
      p("plate-2x3", "charcoal", 1, 1, 21, 90);
      p("round-2x2", "charcoal", 1, 1, 22);
    }),
  },
  {
    id: "owl",
    name: "Le hibou Noisette",
    description:
      "Un hibou perché, avec un ventre clair, deux yeux sombres entourés d’ivoire, un petit bec doré et deux aigrettes pointues.",
    difficulty: "Créatif",
    color: "#eee1cf",
    placements: layout((p) => {
      p("plate-2x6", "brown", 0, 0, 0, 90);
      for (const x of [1, 3]) p("brick-1x1", "yellow", x, 1, 1);
      for (const x of [0, 4]) {
        p("brick-1x2", "brown", x, 0, 1);
        p("slope-1x2", "brown", x, 0, 4, x === 0 ? 180 : 0);
      }
      p("plate-2x3", "brown", 1, 0, 4, 90);
      p("brick-1x3", "brown", 1, 0, 5, 90);
      p("brick-1x3", "ivory", 1, 1, 5, 90);
      p("plate-2x3", "brown", 0, 0, 8, 90);
      p("plate-2x2", "brown", 3, 0, 8);
      p("brick-1x3", "brown", 0, 0, 9, 90);
      p("brick-1x2", "brown", 3, 0, 9, 90);
      for (const x of [0, 4]) p("brick-1x1", "ivory", x, 1, 9);
      for (const x of [1, 3]) p("brick-1x1", "charcoal", x, 1, 9);
      p("plate-1x2", "yellow", 2, 1, 9);
      for (const z of [10, 11]) p("plate-1x1", "brown", 2, 1, z);
      p("plate-2x3", "ivory", 0, 0, 12, 90);
      p("plate-2x2", "ivory", 3, 0, 12);
      for (const x of [0, 4])
        p("slope-1x2", "brown", x, 0, 13, x === 0 ? 0 : 180);
      for (const y of [0, 1]) p("tile-1x3", "brown", 1, y, 13, 90);
    }),
  },
];
