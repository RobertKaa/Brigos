import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

export const OBJECTS_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "totem",
    name: "Le petit totem",
    description:
      "Cinq briques identiques, toutes vos couleurs. Une première tour bien attachée.",
    difficulty: "Premiers pas",
    color: "#fce6b5",
    placements: layout((p) => {
      for (let level = 0; level < 5; level++)
        p("brick-2x2", undefined, 0, 0, level * 3);
    }),
  },
  {
    id: "bench",
    name: "Le banc du parc",
    description:
      "Deux supports larges, une assise et un vrai dossier reliés par une plaque.",
    difficulty: "Premiers pas",
    color: "#dcebe4",
    placements: layout((p) => {
      for (const x of [0, 3]) p("brick-1x2", "orange", x, 0, 0);
      p("plate-2x4", "mint", 0, 0, 3, 90);
      for (const x of [0, 3]) p("brick-1x1", "orange", x, 0, 4);
      p("brick-1x4", "mint", 0, 0, 7, 90);
      p("tile-1x4", "mint", 0, 1, 4, 90);
    }),
  },
  {
    id: "robot",
    name: "Brigobot",
    description:
      "Un compagnon aux bras levés, avec de vraies épaules qui relient tous ses membres.",
    difficulty: "Créatif",
    color: "#e6e0f4",
    placements: layout((p) => {
      for (const x of [1, 3])
        for (const z of [0, 3]) p("brick-1x2", "ivory", x, 0, z);
      p("plate-2x4", "blue", 1, 0, 6, 90);
      for (const z of [7, 10]) p("brick-2x2", "blue", 2, 0, z);
      p("plate-2x6", "blue", 0, 0, 13, 90);
      for (const x of [0, 5]) {
        p("brick-1x2", "orange", x, 0, 14);
        p("round-1x1", "orange", x, 0, 17);
      }
      p("brick-2x2", "ivory", 2, 0, 14);
      p("brick-1x2", "ivory", 2, 0, 17, 90);
      p("brick-1x2", "charcoal", 2, 1, 17, 90);
      p("plate-2x2", "ivory", 2, 0, 20);
    }),
  },
  {
    id: "mosaic",
    name: "Le cœur pixel",
    description:
      "Trente-six petites tuiles dessinent un cœur rétro, chacune clipsée sur sa base.",
    difficulty: "Créatif",
    color: "#f4dde3",
    placements: layout((p) => {
      p("plate-6x6", "ivory", 0, 0, 0);
      const pixels = [
        "010010",
        "111111",
        "111111",
        "011110",
        "001100",
        "000000",
      ];
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 6; x++)
          p("tile-1x1", pixels[y][x] === "1" ? "coral" : "ivory", x, y, 1);
    }),
  },
  {
    id: "mailbox",
    name: "La boîte aux lettres",
    description:
      "Une boîte corail perchée sur son pied graphite, avec une fente sombre bien visible sous son petit toit.",
    difficulty: "Premiers pas",
    color: "#f4dfd8",
    placements: layout((p) => {
      p("plate-2x4", "mint", 0, 0, 0);
      for (const z of [1, 4, 7]) p("brick-1x2", "charcoal", 0, 1, z);
      p("plate-2x4", "coral", 0, 0, 10);
      p("brick-2x3", "coral", 0, 1, 11);
      p("brick-1x2", "coral", 0, 0, 11, 90);
      p("plate-1x2", "charcoal", 0, 0, 14, 90);
      p("plate-2x3", "coral", 0, 1, 14);
      p("plate-2x4", "coral", 0, 0, 15);
      p("slope-1x2", "coral", 0, 1, 16, 180);
      p("slope-1x2", "coral", 1, 1, 16);
      for (const y of [0, 3]) p("tile-1x2", "coral", 0, y, 16, 90);
    }),
  },
  {
    id: "hourglass",
    name: "Le sablier doré",
    description:
      "Deux fins montants noisette encadrent deux volumes de sable en gradins, réunis par un goulot étroit au centre.",
    difficulty: "Créatif",
    color: "#e4e9f2",
    placements: layout((p) => {
      p("plate-2x4", "blue", 0, 0, 0, 90);
      p("plate-2x3", "blue", 4, 0, 0, 90);
      p("plate-2x3", "yellow", 1, 0, 1, 90);
      p("plate-2x2", "yellow", 4, 0, 1);
      for (const x of [0, 6])
        for (const z of [1, 4, 7, 10, 13]) p("round-1x1", "brown", x, 0, z);
      p("brick-2x3", "yellow", 2, 0, 2, 90);
      p("slope-1x2", "yellow", 1, 0, 2, 180);
      p("slope-1x2", "yellow", 5, 0, 2);
      p("brick-1x2", "yellow", 3, 0, 5);
      p("plate-2x3", "yellow", 2, 0, 8, 90);
      p("brick-2x3", "yellow", 2, 0, 9, 90);
      p("plate-2x3", "yellow", 1, 0, 12, 90);
      p("plate-2x2", "yellow", 4, 0, 12);
      p("brick-2x3", "yellow", 2, 0, 13, 90);
      for (const x of [1, 5]) p("brick-1x2", "yellow", x, 0, 13);
      p("plate-2x4", "blue", 0, 0, 16, 90);
      p("plate-2x3", "blue", 4, 0, 16, 90);
    }),
  },
  {
    id: "arcade",
    name: "La borne Pixel",
    description:
      "Un écran bleu encadré de violet et un joystick rouge posé sur un pupitre à mi-hauteur.",
    difficulty: "Expert",
    color: "#e8e0f3",
    placements: layout((p) => {
      p("plate-4x4", "charcoal", 0, 0, 0);
      for (const z of [1, 4, 7]) p("brick-4x4", "violet", 0, 0, z);
      p("plate-2x4", "yellow", 0, 2, 10, 90);
      p("round-1x1", "coral", 1, 3, 11);
      p("tile-1x1", "blue", 2, 3, 11);
      for (const z of [10, 13]) {
        p("brick-1x4", "violet", 0, 0, z, 90);
        for (const x of [0, 3]) p("brick-1x1", "violet", x, 1, z);
        p("brick-1x2", "blue", 1, 1, z, 90);
      }
      p("plate-2x4", "violet", 0, 0, 16, 90);
      p("tile-1x4", "yellow", 0, 1, 17, 90);
      for (const x of [0, 2]) p("slope-1x2", "violet", x, 0, 17, 270);
    }),
  },
  {
    id: "piano",
    name: "Le piano de minuit",
    description:
      "Un piano droit graphite sur quatre pieds, avec une haute caisse et six longues touches claires. Les trois touches noires plus courtes occupent l’arrière du clavier.",
    difficulty: "Expert",
    color: "#e3e1ee",
    placements: layout((p) => {
      for (const x of [0, 5])
        for (const y of [0, 3])
          for (const z of [0, 3]) p("brick-1x1", "charcoal", x, y, z);
      p("plate-4x6", "charcoal", 0, 0, 6, 90);
      for (const z of [7, 10, 13]) p("brick-2x6", "charcoal", 0, 0, z, 90);
      for (let x = 0; x < 6; x++) {
        const blackKey = [1, 3, 4].includes(x);
        p(blackKey ? "plate-1x2" : "tile-1x2", "ivory", x, 2, 7);
        if (blackKey) p("tile-1x1", "charcoal", x, 2, 8);
      }
      p("plate-2x6", "charcoal", 0, 0, 16, 90);
      p("tile-2x4", "charcoal", 0, 0, 17, 90);
      p("tile-2x2", "charcoal", 4, 0, 17);
    }),
  },
  {
    id: "armchair",
    name: "La petite chaise",
    description:
      "Huit pièces courantes, toutes vos couleurs : quatre pieds, une assise et un dossier.",
    difficulty: "Premiers pas",
    color: "#f2e4d9",
    placements: layout((p) => {
      for (const x of [0, 1])
        for (const y of [0, 2]) p("brick-1x1", undefined, x, y, 0);
      p("plate-2x3", undefined, 0, 0, 3);
      for (const z of [4, 7]) p("brick-1x2", undefined, 0, 0, z, 90);
      p("tile-1x1", undefined, 0, 2, 4);
    }),
  },
  {
    id: "pyramid",
    name: "L’escalier des débutants",
    description:
      "Six pièces courantes, en couleurs libres, pour une petite silhouette en marches d’escalier.",
    difficulty: "Premiers pas",
    color: "#f4e8ca",
    placements: layout((p) => {
      p("brick-2x4", undefined, 0, 0, 0);
      p("plate-2x4", undefined, 0, 0, 3);
      p("brick-2x2", undefined, 0, 1, 4);
      p("brick-1x2", undefined, 0, 1, 7, 90);
      p("plate-1x2", undefined, 0, 1, 10, 90);
      p("tile-1x1", undefined, 0, 1, 11);
    }),
  },
  {
    id: "starter-bridge",
    name: "Le pont des débutants",
    description:
      "Quatre pieds, un tablier et deux garde-corps le long du passage. Neuf pièces, toutes couleurs acceptées.",
    difficulty: "Premiers pas",
    color: "#e1ebe7",
    placements: layout((p) => {
      for (const x of [0, 3])
        for (const y of [0, 3]) p("brick-1x1", undefined, x, y, 0);
      for (const x of [0, 2]) p("plate-2x4", undefined, x, 0, 3);
      p("plate-2x4", undefined, 1, 0, 4);
      for (const x of [0, 3]) p("brick-1x4", undefined, x, 0, 4);
    }),
  },
  {
    id: "cup",
    name: "La tasse du matin",
    description:
      "Une tasse ivoire à parois carrées, remplie de café noisette. Son anse forme une vraie boucle verticale reliée au bord et au pied de la tasse.",
    difficulty: "Créatif",
    color: "#eee4d5",
    placements: layout((p) => {
      p("plate-4x6", "brown", 0, 0, 0, 90);
      for (const z of [1, 4, 7]) {
        p("brick-1x4", "ivory", 0, 0, z);
        for (const y of [0, 3]) p("brick-1x2", "ivory", 1, y, z, 90);
        p("brick-1x1", "ivory", 3, 0, z);
        p("brick-1x2", "ivory", 3, 2, z);
        p("brick-2x2", "brown", 1, 1, z);
      }
      p("brick-1x3", "ivory", 3, 1, 1, 90);
      p("arch-1x3", "ivory", 3, 1, 4, 90);
      for (const x of [0, 3]) p("tile-1x4", "ivory", x, 0, 10);
      for (const y of [0, 3]) p("tile-1x2", "ivory", 1, y, 10, 90);
      p("tile-2x2", "brown", 1, 1, 10);
    }),
  },
  {
    id: "table",
    name: "La table du goûter",
    description:
      "Quatre pieds noisette et un petit napperon clair sur un plateau carré.",
    difficulty: "Premiers pas",
    color: "#eee3d3",
    placements: layout((p) => {
      for (const x of [0, 3])
        for (const y of [0, 3])
          for (const z of [0, 3]) p("brick-1x1", "brown", x, y, z);
      p("plate-4x4", "brown", 0, 0, 6);
      p("tile-2x2", "ivory", 1, 1, 7);
      for (const y of [0, 3]) p("tile-1x4", "brown", 0, y, 7, 90);
    }),
  },
  {
    id: "streetlamp",
    name: "Le lampadaire du square",
    description:
      "Un pied fin, une lanterne dorée et un petit toit graphite pour éclairer le square en imagination.",
    difficulty: "Créatif",
    color: "#e4e9e6",
    placements: layout((p) => {
      p("plate-4x4", "charcoal", 0, 0, 0);
      for (const z of [1, 4, 7, 10]) p("round-1x1", "charcoal", 1, 1, z);
      p("plate-2x2", "charcoal", 1, 1, 13);
      for (const z of [14, 17, 20]) p("brick-2x2", "yellow", 1, 1, z);
      p("plate-4x4", "charcoal", 0, 0, 23);
      p("slope-2x4", "charcoal", 0, 0, 24, 180);
      p("slope-2x4", "charcoal", 2, 0, 24);
    }),
  },
];
