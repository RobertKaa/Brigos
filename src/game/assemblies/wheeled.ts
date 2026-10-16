import { layout } from "./layout";
import type { AssemblyPlacement, AssemblySpec } from "./layout";

type AddPart = Parameters<Parameters<typeof layout>[0]>[0];

/** Assemble each coaxial wheel train before fitting its bearing and bodywork. */
function wheeledLayout(
  rows: number[],
  body: (p: AddPart) => void,
): AssemblyPlacement[] {
  const wheels: AssemblyPlacement[] = [];
  for (const y of rows) {
    const parts = layout((p) => {
      p("special-wheel", undefined, -1, y, 0);
      p("special-wheel", undefined, 4, y, 0);
      p("special-axle", undefined, 0, y + 0.5, 2.5);
      p("special-bearing", undefined, 1, y, 2);
    });
    // Z sorting alone puts the bearing before the axle inside its tunnel.
    for (const modelId of ["special-wheel", "special-axle", "special-bearing"])
      wheels.push(...parts.filter((part) => part.modelId === modelId));
  }
  return [...wheels, ...layout(body)].map((part, index) => ({
    ...part,
    key: `mechanical-${String(index + 1).padStart(3, "0")}`,
  }));
}

export const WHEELED_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "seed-handcart",
    name: "La charrette des pousses",
    description:
      "Deux roues facettées sur un essieu guidé par son palier, un bac en bois et un long timon : les jeunes plants sont prêts pour le jardin.",
    difficulty: "Créatif",
    theme: "vehicles",
    color: "#e2ebd7",
    placements: wheeledLayout([0], (p) => {
      p("plate-4x4", "brown", 0, -1, 4);
      for (const x of [0, 3]) p("brick-1x4", "brown", x, -1, 5);
      for (const y of [-1, 2]) p("brick-1x2", "brown", 1, y, 5, 90);
      for (const x of [1, 2]) {
        p("brick-1x2", "brown", x, 0, 5);
        p("slope-1x2", "green", x, 0, 8, x === 1 ? 180 : 0);
      }
      p("plate-1x4", "brown", 1, 2, 8);
      p("tile-1x2", "brown", 1, 5, 9, 90);
    }),
  },
  {
    id: "dune-scout",
    name: "L’éclaireur des dunes",
    description:
      "Un petit véhicule orange à quatre roues et deux trains guidés. Son nez bas, sa cabine ouverte et sa trappe arrière articulée dessinent une silhouette d’explorateur.",
    difficulty: "Créatif",
    theme: "vehicles",
    color: "#f1e1c7",
    placements: wheeledLayout([0, 6], (p) => {
      for (const x of [0, 2]) p("plate-2x8", "charcoal", x, 0, 4);
      p("plate-2x4", "orange", 0, 0, 5, 90);
      p("plate-1x4", "orange", 0, 6, 5, 90);
      p("tile-1x2", "orange", 1, 7, 5, 90);
      for (const x of [0, 3]) p("plate-1x1", "orange", x, 7, 5);
      for (const x of [0, 3]) p("brick-1x4", "orange", x, 2, 5);
      p("plate-2x4", "orange", 0, 4, 8, 90);
      for (const x of [0, 2]) p("slope-2x2", "orange", x, 0, 6, 270);
      p("brick-1x2", "charcoal", 1, 3, 5, 90);
      p("tile-1x2", "charcoal", 1, 3, 8, 90);
      p("plate-1x2", "blue", 1, 2, 5, 90);
      p("tile-1x2", "blue", 1, 2, 6, 90);
      p("special-hinge", undefined, 1, 6, 6);
      for (const y of [6, 7]) p("plate-1x4", "orange", 0, y, 8, 90);
      p("tile-1x2", "yellow", 1, 7, 9, 90);
      for (const x of [0, 3]) p("tile-1x1", "yellow", x, 7, 6);
    }),
  },
  {
    id: "crystal-hauler",
    name: "Le transporteur des éclats",
    description:
      "Six roues, trois essieux dans leurs paliers et une longue plateforme bleue. Une cabine compacte précède deux caisses d’éclats tenues entre les rebords du plateau.",
    difficulty: "Expert",
    theme: "vehicles",
    color: "#dfe6f3",
    placements: wheeledLayout([0, 4, 8], (p) => {
      for (const y of [0, 6]) p("plate-4x6", "charcoal", 0, y, 4);
      for (const x of [0, 2]) p("plate-2x8", "blue", x, 2, 5);
      for (const y of [0, 10]) p("plate-2x4", "blue", 0, y, 5, 90);
      for (const x of [0, 3]) p("brick-1x3", "blue", x, 0, 6);
      p("brick-1x2", "blue", 1, 2, 6, 90);
      p("brick-1x2", "charcoal", 1, 0, 6, 90);
      p("brick-1x2", "blue", 1, 1, 6, 90);
      for (const x of [0, 2]) p("slope-2x2", "blue", x, 0, 9, 270);
      p("plate-2x4", "ivory", 0, 2, 9, 90);
      for (const y of [4, 8]) {
        p("brick-1x2", "violet", 1, y, 6, 90);
        for (const z of [6, 7]) p("plate-1x2", "violet", 1, y + 1, z, 90);
        p("tile-1x2", "violet", 1, y + 1, 8, 90);
        p("special-hinge", undefined, 1, y, 9);
        // Each cargo hatch attaches to only one half of its hinge.
        p("tile-1x2", "mint", 1, y, 11, 90);
        p("tile-1x2", "violet", 1, y + 1, 11, 90);
      }
      for (const x of [0, 3]) {
        p("tile-1x4", "blue", x, 4, 6);
        p("tile-1x3", "blue", x, 8, 6);
      }
      for (const x of [0, 3]) p("tile-1x1", "yellow", x, 11, 6);
    }),
  },
  {
    id: "travelling-library",
    name: "La bibliothèque itinérante",
    description:
      "Une bibliothèque sur quatre roues, avec une cabine bleue, de hauts rayonnages et un auvent ivoire. Les deux volets de l’auvent reposent sur leurs articulations apparentes.",
    difficulty: "Expert",
    theme: "vehicles",
    color: "#e8e0ef",
    placements: wheeledLayout([0, 6], (p) => {
      for (const x of [0, 2]) p("plate-2x8", "charcoal", x, 0, 4);
      for (const y of [0, 6]) p("plate-2x4", "violet", 0, y, 5, 90);
      p("plate-4x4", "violet", 0, 2, 5);
      for (const x of [0, 3]) p("brick-1x2", "blue", x, 0, 6);
      p("brick-1x2", "charcoal", 1, 0, 6, 90);
      p("brick-1x2", "ivory", 1, 1, 6, 90);
      p("plate-1x4", "ivory", 0, 1, 9, 90);
      for (const y of [2, 5]) {
        for (const z of [6, 9]) p("brick-1x4", "ivory", 0, y, z, 90);
        p("brick-1x2", "ivory", 2, y, 13, 90);
        p("brick-1x1", "ivory", 0, y, 13);
        for (const z of [13, 14]) p("plate-1x1", "ivory", 1, y, z);
        p("tile-1x1", "ivory", 1, y, 15);
      }
      for (const x of [0, 3]) p("brick-1x2", "ivory", x, 3, 6);
      // Shelves leave the middle opening visible from both sides.
      p("plate-4x4", "brown", 0, 2, 12);
      for (const [x, y, color] of [
        [0, 3, "coral"],
        [0, 4, "yellow"],
        [3, 3, "blue"],
        [3, 4, "green"],
      ] as const) {
        p("brick-1x1", color, x, y, 13);
        p("tile-1x1", color, x, y, 16);
      }
      for (const y of [2, 4]) p("special-hinge", undefined, 1, y, 16, 90);
      for (const y of [2, 4]) {
        p("plate-2x2", "ivory", 0, y, 18);
        p("plate-2x2", "ivory", 2, y, 18);
      }
      for (const x of [0, 3]) p("tile-1x1", "yellow", x, 7, 6);
      p("plate-1x4", "violet", 0, 6, 6, 90);
      p("tile-1x4", "violet", 0, 6, 7, 90);
    }),
  },
];
