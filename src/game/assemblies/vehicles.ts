import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

export const VEHICLES_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "spaceship",
    name: "Le vaisseau d’exploration",
    description:
      "Une sculpture de vaisseau à ailes étagées et symétriques, avec un long nez, un cockpit sombre et une dérive arrière.",
    difficulty: "Créatif",
    color: "#dee8f6",
    placements: layout((p) => {
      p("plate-4x6", "charcoal", 0, 1, 0);
      p("plate-2x8", "blue", -2, 2, 1, 90);
      p("plate-2x6", "blue", -1, 4, 1, 90);
      p("plate-2x2", "blue", 1, 6, 1);
      p("brick-2x4", "ivory", 1, 2, 2);
      p("brick-2x2", "ivory", 1, 6, 2);
      p("slope-2x2", "charcoal", 1, 5, 5, 90);
      p("slope-2x2", "blue", 1, 7, 5, 90);
      for (const x of [-2, 5]) p("tile-1x2", "yellow", x, 2, 2);
      for (const x of [-1, 3]) p("slope-2x2", "blue", x, 4, 2, 90);
      p("brick-1x2", "blue", 1, 2, 5, 90);
      p("slope-1x2", "yellow", 1, 2, 8, 90);
    }),
  },
  {
    id: "boat",
    name: "Le bateau du canal",
    description:
      "Une sculpture de bateau à coque bleue, avec une cabine claire, une cheminée et deux petits bastingages.",
    difficulty: "Créatif",
    color: "#dce9f7",
    placements: layout((p) => {
      p("brick-2x6", "blue", 1, 0, 0);
      p("plate-4x6", "blue", 0, 0, 3);
      for (const y of [0, 4]) {
        for (const x of [0, 2]) p("slope-2x2", "blue", x, y, 4, y ? 90 : 270);
      }
      p("brick-2x4", "ivory", 0, 2, 4, 90);
      p("brick-1x2", "blue", 1, 2, 7, 90);
      p("brick-1x2", "ivory", 1, 3, 7, 90);
      p("plate-2x2", "charcoal", 1, 2, 10);
      p("round-1x1", "orange", 1, 3, 11);
      for (const x of [0, 3]) {
        p("tile-1x2", "yellow", x, 2, 7);
      }
    }),
  },
  {
    id: "airplane",
    name: "L’avion des couleurs",
    description:
      "Un avion sculpté au fuselage allongé, avec de grandes ailes jaunes, un nez incliné et un empennage portant une dérive verticale corail.",
    difficulty: "Créatif",
    color: "#e0e9f5",
    placements: layout((p) => {
      p("plate-2x8", "charcoal", 0, 0, 0);
      p("plate-2x2", "charcoal", 0, 8, 0);
      p("plate-2x8", "blue", -3, 4, 1, 90);
      p("brick-2x3", "blue", 0, 0, 1);
      p("brick-2x4", "blue", 0, 6, 1);
      p("brick-2x2", "ivory", 0, 4, 2);
      p("slope-2x2", "charcoal", 0, 4, 5, 90);
      p("plate-1x4", "blue", -1, 1, 4, 90);
      for (const x of [-3, 2])
        for (const y of [4, 5]) p("tile-1x3", "yellow", x, y, 2, 90);
      p("slope-2x2", "blue", 0, 8, 4, 90);
      p("plate-2x2", "blue", 0, 6, 4);
      p("tile-1x2", "coral", 0, 2, 4, 90);
      p("brick-1x1", "coral", 0, 1, 5);
      p("brick-1x1", "coral", 0, 1, 8);
      p("slope-1x1", "coral", 0, 1, 11, 270);
    }),
  },
  {
    id: "sailboat",
    name: "Le voilier de la baie",
    description:
      "Une petite sculpture de voilier : coque allongée, mât en bois et grande voile triangulaire à bord incliné. Chaque rang de voile rejoint le mât par une plaque à tenons.",
    difficulty: "Créatif",
    color: "#dcecf3",
    placements: layout((p) => {
      p("plate-2x8", "blue", 0, 0, 0);
      p("brick-2x6", "blue", 0, 1, 1);
      p("plate-2x8", "brown", 0, 0, 4);
      p("slope-1x2", "blue", 0, 0, 5, 270);
      p("slope-1x2", "blue", 0, 7, 5, 90);
      for (let row = 0; row < 4; row++) {
        const length = 4 - row;
        const z = 5 + row * 4;
        p("brick-1x1", "brown", 0, 2, z);
        p(`brick-1x${length}`, "ivory", 0, 3, z);
        p(`plate-1x${Math.max(2, length)}`, "ivory", 0, 2, z + 3);
        p("slope-1x1", "ivory", 0, 2 + length, z + 3 + (row === 3 ? 1 : 0), 90);
      }
      p("brick-1x1", "brown", 0, 2, 21);
      p("tile-1x1", "yellow", 0, 2, 24);
      p("tile-1x3", "coral", 1, 2, 5);
    }),
  },
];
