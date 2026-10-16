import type { ColorId } from "../catalog";
import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

export const ARCHITECTURE_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "house",
    name: "La maison corail",
    description:
      "Des murs liés par une plaque de toiture et quatre pentes tournées vers le faîtage.",
    difficulty: "Créatif",
    color: "#f6ddd7",
    placements: layout((p) => {
      p("plate-6x6", "blue", 0, 0, 0);
      for (const z of [1, 4, 7]) {
        p("brick-1x3", "coral", 1, 1, z, 90);
        p("brick-1x4", "coral", 4, 1, z);
      }
      p("special-window", "ivory", 1, 2, 1);
      p("brick-1x2", "coral", 1, 2, 7);
      p("special-door", "ivory", 1, 4, 1, 90);
      p("plate-4x4", "ivory", 1, 1, 10);
      p("slope-2x4", "coral", 1, 1, 11, 180);
      p("slope-2x4", "coral", 3, 1, 11);
    }),
  },
  {
    id: "lighthouse",
    name: "Le phare des Brigos",
    description:
      "Une tour rayée, une lanterne et un toit débordant fixés au même axe.",
    difficulty: "Créatif",
    color: "#f7e8ce",
    placements: layout((p) => {
      p("plate-4x4", "blue", 0, 0, 0);
      for (let level = 0; level < 6; level++)
        p("round-2x2", level % 2 ? "coral" : "ivory", 1, 1, 1 + level * 3);
      p("plate-4x4", "ivory", 0, 0, 19);
      for (const z of [20, 23, 26]) {
        p("round-2x2", "yellow", 1, 1, z);
        for (const [x, y] of [
          [0, 1],
          [3, 2],
          [1, 3],
          [2, 0],
        ])
          p("brick-1x1", "charcoal", x, y, z);
      }
      p("plate-4x4", "charcoal", 0, 0, 29);
      p("tile-2x2", "coral", 1, 1, 30);
    }),
  },
  {
    id: "well",
    name: "Le puits du village",
    description:
      "Une margelle ouverte laisse voir l’eau, avec deux montants en bois reliés au-dessus du bord arrière.",
    difficulty: "Créatif",
    color: "#e4e8db",
    placements: layout((p) => {
      p("plate-4x4", "green", 0, 0, 0);
      p("tile-2x2", "blue", 1, 1, 1);
      for (const z of [1, 4]) {
        for (const y of [0, 3]) p("brick-1x4", "ivory", 0, y, z, 90);
        for (const x of [0, 3]) p("brick-1x2", "ivory", x, 1, z);
      }
      for (const x of [0, 3])
        for (const z of [7, 10]) p("brick-1x1", "brown", x, 0, z);
      p("brick-1x4", "brown", 0, 0, 13, 90);
      p("tile-1x4", "brown", 0, 0, 16, 90);
    }),
  },
  {
    id: "bridge",
    name: "Le petit pont",
    description:
      "Deux arches soutiennent le tablier; les garde-corps se clipsent sur ses bords.",
    difficulty: "Créatif",
    color: "#deebef",
    placements: layout((p) => {
      p("plate-2x4", "blue", 0, 0, 0);
      p("plate-2x4", "blue", 3, 0, 0);
      p("arch-1x4", "ivory", 1, 0, 1);
      p("arch-1x4", "ivory", 3, 0, 1);
      p("plate-4x4", "ivory", 1, 0, 7);
      p("tile-2x4", "charcoal", 2, 0, 8);
      for (const x of [1, 4]) {
        p("brick-1x4", "ivory", x, 0, 8);
        p("tile-1x4", "yellow", x, 0, 11);
      }
    }),
  },
  {
    id: "castle",
    name: "Le château des nuages",
    description:
      "Une grande porte, quatre tours et des créneaux pour protéger vos prochaines idées.",
    difficulty: "Expert",
    color: "#e5e0f2",
    placements: layout((p) => {
      p("plate-6x6", "mint", 0, 0, 0);
      p("special-door", "charcoal", 1, 5, 1, 90);
      for (const z of [1, 4, 7]) {
        p("brick-1x1", "ivory", 0, 5, z);
        p("brick-1x2", "ivory", 4, 5, z, 90);
        for (const x of [0, 5]) p("brick-1x4", "ivory", x, 1, z);
        p("brick-1x6", "ivory", 0, 0, z, 90);
      }
      for (const x of [0, 5]) p("plate-1x4", "violet", x, 1, 10);
      for (const y of [0, 5]) {
        p("plate-1x4", "violet", 0, y, 10, 90);
        p("plate-1x2", "violet", 4, y, 10, 90);
      }
      for (const [x, y] of [
        [0, 0],
        [0, 5],
        [5, 0],
        [5, 5],
        [2, 0],
        [3, 5],
        [0, 3],
        [5, 2],
      ])
        p("brick-1x1", "ivory", x, y, 11);
      for (const x of [0, 5])
        for (const y of [0, 5]) {
          p("brick-1x1", "violet", x, y, 14);
          p("round-1x1", "yellow", x, y, 17);
        }
    }),
  },
  {
    id: "cafe",
    name: "Le café Soleil",
    description:
      "Un kiosque ouvert, avec un comptoir, une table et un petit auvent rayé qui laisse la terrasse visible.",
    difficulty: "Créatif",
    color: "#f6e5c5",
    placements: layout((p) => {
      p("plate-6x6", "ivory", 0, 0, 0);
      for (const z of [1, 4, 7]) {
        p("brick-1x6", "brown", 0, 0, z, 90);
        for (const x of [0, 5]) p("brick-1x1", "brown", x, 1, z);
      }
      p("plate-2x6", "ivory", 0, 0, 10, 90);
      for (let x = 0; x < 6; x++)
        p("tile-1x2", x % 2 ? "yellow" : "coral", x, 0, 11);
      p("brick-1x4", "coral", 1, 2, 1, 90);
      p("plate-1x4", "brown", 1, 2, 4, 90);
      p("tile-1x1", "charcoal", 1, 2, 5);
      p("round-1x1", "ivory", 2, 2, 5);
      p("tile-1x2", "coral", 3, 2, 5, 90);
      p("brick-1x1", "brown", 1, 4, 1);
      p("tile-2x2", "yellow", 0, 3, 4);
      p("round-1x1", "green", 3, 4, 1);
    }),
  },
  {
    id: "library",
    name: "La bibliothèque arc-en-ciel",
    description:
      "Trois étagères traversantes relient les montants autour de douze livres colorés.",
    difficulty: "Expert",
    color: "#f2e4d8",
    placements: layout((p) => {
      p("plate-6x6", "ivory", 0, 0, 0);
      const books: ColorId[] = ["coral", "yellow", "blue", "violet"];
      for (let level = 0; level < 3; level++) {
        const z = 1 + level * 4;
        for (const x of [0, 5]) p("brick-1x4", "brown", x, 1, z);
        for (let x = 1; x < 5; x++)
          p("brick-1x4", books[(x + level - 1) % books.length], x, 1, z);
        p("plate-4x6", "brown", 0, 1, z + 3, 90);
      }
      p("round-1x1", "brown", 1, 1, 13);
      p("round-1x1", "green", 1, 1, 16);
    }),
  },
  {
    id: "greenhouse",
    name: "Le jardin sous les arches",
    description:
      "Une pergola à ciel ouvert encadre trois petites plantes, visibles entre les arches et les traverses en bois.",
    difficulty: "Expert",
    color: "#e0eee8",
    placements: layout((p) => {
      p("plate-6x6", "green", 0, 0, 0);
      for (const x of [0, 5]) p("arch-1x4", "ivory", x, 1, 1);
      for (const y of [0, 5]) p("arch-1x4", "ivory", 1, y, 1, 90);
      for (const x of [0, 5])
        for (const y of [0, 5])
          for (const z of [1, 4]) p("brick-1x1", "ivory", x, y, z);
      for (const [x, y] of [
        [1, 2],
        [3, 2],
        [3, 4],
      ]) {
        p("round-1x1", "brown", x, y, 1);
        p("round-1x1", "green", x, y, 4);
      }
      for (const y of [0, 5])
        for (const x of [0, 3]) p("plate-1x3", "brown", x, y, 7, 90);
      for (const x of [0, 5]) p("plate-1x4", "brown", x, 1, 7);
    }),
  },
  {
    id: "pagoda",
    name: "La pagode des lanternes",
    description:
      "Deux pavillons superposés portent des toits de plus en plus petits et un fleuron doré vertical.",
    difficulty: "Expert",
    color: "#f0dfdf",
    placements: layout((p) => {
      p("plate-6x6", "coral", 0, 0, 0);
      for (const x of [1, 4])
        for (const y of [1, 4])
          for (const z of [1, 4]) p("round-1x1", "ivory", x, y, z);
      p("plate-6x6", "charcoal", 0, 0, 7);
      p("brick-2x2", "coral", 2, 2, 8);
      for (const y of [0, 2, 4]) {
        p("slope-2x2", "charcoal", 0, y, 8, 180);
        p("slope-2x2", "charcoal", 4, y, 8);
      }
      p("slope-2x2", "charcoal", 2, 0, 8, 270);
      p("slope-2x2", "charcoal", 2, 4, 8, 90);
      p("plate-4x4", "coral", 1, 1, 11);
      for (const x of [1, 4])
        for (const y of [1, 4]) p("round-1x1", "ivory", x, y, 12);
      p("plate-4x4", "charcoal", 1, 1, 15);
      p("brick-2x2", "coral", 2, 2, 16);
      for (const y of [1, 3]) {
        p("slope-1x2", "charcoal", 1, y, 16, 180);
        p("slope-1x2", "charcoal", 4, y, 16);
      }
      p("slope-1x2", "charcoal", 2, 1, 16, 270);
      p("slope-1x2", "charcoal", 2, 4, 16, 90);
      p("plate-2x2", "charcoal", 2, 2, 19);
      p("round-2x2", "yellow", 2, 2, 20);
      p("round-1x1", "yellow", 2, 2, 23);
    }),
  },
  {
    id: "chalet",
    name: "Le chalet enneigé",
    description:
      "Un refuge en bois posé sur la neige, avec un toit à deux versants et deux arbustes autour du chalet.",
    difficulty: "Créatif",
    color: "#eee8e2",
    placements: layout((p) => {
      p("plate-6x6", "ivory", 0, 0, 0);
      for (const z of [1, 4]) {
        for (const x of [1, 4]) p("brick-1x4", "brown", x, 1, z);
        p("brick-1x2", "brown", 2, 1, z, 90);
        p("brick-1x2", "charcoal", 2, 4, z, 90);
      }
      p("plate-4x4", "ivory", 1, 1, 7);
      p("slope-2x4", "ivory", 1, 1, 8, 180);
      p("slope-2x4", "ivory", 3, 1, 8);
      for (const [x, y] of [
        [0, 0],
        [5, 5],
      ]) {
        p("round-1x1", "green", x, y, 1);
        p("slope-1x1", "green", x, y, 4);
      }
      p("slope-1x1", "ivory", 0, 3, 1);
      p("slope-1x1", "ivory", 5, 2, 1);
    }),
  },
  {
    id: "spacegate",
    name: "Le portail interstellaire",
    description:
      "Deux grands montants bleus portent une traverse liée et une balise dorée, devant un parvis lumineux.",
    difficulty: "Créatif",
    color: "#dce4f7",
    placements: layout((p) => {
      p("plate-6x6", "charcoal", 0, 0, 0);
      for (let level = 0; level < 6; level++)
        for (const x of [0, 5]) p("brick-1x2", "blue", x, 2, 1 + level * 3);
      p("plate-2x6", "ivory", 0, 2, 19, 90);
      p("brick-2x6", "blue", 0, 2, 20, 90);
      for (const x of [0, 4]) p("slope-2x2", "ivory", x, 2, 23, x ? 0 : 180);
      p("brick-2x2", "blue", 2, 2, 23);
      p("round-2x2", "yellow", 2, 2, 26);
      for (const x of [1, 4]) {
        p("brick-1x1", "ivory", x, 0, 1);
        p("tile-1x1", "blue", x, 0, 4);
      }
      p("tile-2x4", "yellow", 1, 1, 1, 90);
      p("tile-2x4", "ivory", 1, 3, 1, 90);
    }),
  },
  {
    id: "torii",
    name: "La porte du jardin",
    description:
      "Un portique corail à deux traverses débordantes, solidement posé sur ses deux pieds de pierre.",
    difficulty: "Créatif",
    color: "#f0dfdf",
    placements: layout((p) => {
      p("plate-4x6", "green", 0, 0, 0, 90);
      for (const x of [1, 4]) {
        p("brick-1x2", "charcoal", x, 1, 1);
        for (const z of [4, 7, 10]) p("brick-1x2", "coral", x, 1, z);
      }
      p("plate-2x6", "coral", 0, 1, 13, 90);
      p("brick-1x2", "coral", 1, 1, 14);
      p("brick-1x2", "coral", 4, 1, 14);
      p("plate-2x8", "charcoal", -1, 1, 17, 90);
      p("tile-2x4", "charcoal", -1, 1, 18, 90);
      p("tile-2x4", "charcoal", 3, 1, 18, 90);
    }),
  },
  {
    id: "fountain",
    name: "La fontaine du jardin",
    description:
      "Un bassin symétrique au bord lisse entoure un jet sculpté en Brigos bleus, terminé par une goutte claire.",
    difficulty: "Créatif",
    color: "#e7e8df",
    placements: layout((p) => {
      p("plate-6x6", "green", 0, 0, 0);
      for (const y of [0, 5]) p("brick-1x6", "ivory", 0, y, 1, 90);
      for (const x of [0, 5]) p("brick-1x4", "ivory", x, 1, 1);
      p("plate-4x4", "blue", 1, 1, 1);
      for (const x of [1, 4]) p("tile-1x4", "blue", x, 1, 2);
      for (const y of [1, 4]) p("tile-1x2", "blue", 2, y, 2, 90);
      p("round-2x2", "blue", 2, 2, 2);
      p("round-1x1", "blue", 2, 2, 5);
      p("round-1x1", "ivory", 2, 2, 8);
      for (const x of [0, 5]) p("tile-1x4", "ivory", x, 1, 4);
      for (const y of [0, 5])
        for (const x of [0, 3]) p("tile-1x3", "ivory", x, y, 4, 90);
    }),
  },
  {
    id: "aqueduct",
    name: "L’aqueduc des trois arches",
    description:
      "Trois arches portent un canal ouvert et bordé de pierre, avec une ligne d’eau bleue visible au sommet.",
    difficulty: "Expert",
    color: "#e1eaf0",
    placements: layout((p) => {
      for (const y of [0, 6]) p("plate-2x6", "green", 0, y, 0);
      for (const z of [1, 4])
        for (const y of [0, 3, 7, 11])
          p(
            y === 3 || y === 7 ? "brick-2x2" : "brick-1x2",
            "ivory",
            0,
            y,
            z,
            y === 3 || y === 7 ? 0 : 90,
          );
      for (const y of [0, 4, 8]) p("arch-2x4", "ivory", 0, y, 7);
      for (const y of [0, 6]) p("plate-4x6", "ivory", -1, y, 13);
      for (const y of [0, 4, 8]) p("tile-2x4", "blue", 0, y, 14);
      for (const x of [-1, 2]) {
        for (const y of [0, 6]) p("brick-1x6", "ivory", x, y, 14);
      }
    }),
  },
];
