import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

// Independent Brigo designs, shown at rest. Each hinge has its rear leaf fixed
// to the frame and only its front leaf joined to the lid, deck or writing top.
// The gap between the leaves stays exposed; no movement is simulated here.
export const ARTICULATED_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "cartographer-chest",
    name: "Le coffre des cartographes",
    description:
      "Un coffre noisette à carte azur et bordures dorées. Ses deux articulations restent visibles derrière le couvercle fermé, qui repose sur un rebord lisse.",
    difficulty: "Créatif",
    theme: "objects",
    color: "#eadac5",
    previewRotation: 90,
    placements: layout((p) => {
      p("plate-6x6", "brown", 0, 0, 0);
      for (const z of [1, 4]) {
        for (const y of [0, 4]) p("brick-1x6", "brown", 0, y, z, 90);
        for (const x of [0, 5]) p("brick-1x3", "brown", x, 1, z);
      }
      // Smooth rims meet the lid without fastening it to the fixed frame.
      for (const x of [0, 5]) {
        p("plate-1x3", "brown", x, 1, 7);
        p("tile-1x3", "charcoal", x, 1, 8);
      }
      for (const x of [0, 3]) {
        p("plate-1x3", "brown", x, 4, 7, 90);
        p("tile-1x3", "charcoal", x, 4, 8, 90);
      }
      for (const x of [1, 3]) p("special-hinge", undefined, x, 0, 7);
      p("plate-4x6", "brown", 0, 1, 9, 90);
      for (const x of [0, 5]) p("tile-1x3", "yellow", x, 1, 10);
      for (const x of [0, 3]) p("tile-1x3", "yellow", x, 4, 10, 90);
      p("plate-2x4", "blue", 1, 2, 10, 90);
      p("tile-2x2", "blue", 1, 2, 11);
      p("tile-2x2", "ivory", 3, 2, 11);
      p("plate-1x4", "brown", 1, 1, 10, 90);
      p("tile-1x1", "ivory", 1, 1, 11);
      p("tile-1x1", "yellow", 2, 1, 11);
      p("tile-1x2", "ivory", 3, 1, 11, 90);
    }),
  },
  {
    id: "canal-liftbridge",
    name: "La passerelle du canal",
    description:
      "Une passerelle de bois à deux garde-corps, entre des marches de pierre. Le tablier est présenté abaissé ; deux articulations relient son extrémité à la première culée.",
    difficulty: "Créatif",
    theme: "architecture",
    color: "#dce9ea",
    previewRotation: 90,
    placements: layout((p) => {
      for (const y of [0, 6]) p("plate-6x6", "blue", 0, y, 0);
      // The submerged foundation joins both ground sections into one model.
      p("plate-2x8", "blue", 2, 2, 1);
      for (const y of [2, 8]) {
        for (const z of [2, 5]) p("brick-1x4", "ivory", 1, y, z, 90);
      }
      for (const x of [1, 3]) p("special-hinge", undefined, x, 2, 8);
      p("plate-1x4", "ivory", 1, 8, 8, 90);
      p("tile-1x4", "charcoal", 1, 8, 9, 90);
      p("plate-4x6", "brown", 1, 3, 10);
      for (const x of [1, 4]) {
        p("brick-1x6", "brown", x, 3, 11);
        for (const y of [3, 6]) p("tile-1x3", "mint", x, y, 14);
      }
      p("tile-2x4", "brown", 2, 4, 11);
      for (const y of [3, 8]) p("tile-1x2", "brown", 2, y, 11, 90);
      // Stone steps stop short of the hinge and the free end of the deck.
      p("brick-1x4", "ivory", 1, 0, 1, 90);
      p("tile-1x4", "ivory", 1, 0, 4, 90);
      for (const z of [1, 4]) p("brick-1x4", "ivory", 1, 1, z, 90);
      p("tile-1x4", "ivory", 1, 1, 7, 90);
      for (const z of [2, 5]) p("brick-1x4", "ivory", 1, 9, z, 90);
      p("tile-1x4", "ivory", 1, 9, 8, 90);
      p("brick-1x4", "ivory", 1, 10, 1, 90);
      p("tile-1x4", "ivory", 1, 10, 4, 90);
      for (const x of [0, 5])
        for (const y of [3, 7]) p("tile-1x4", "mint", x, y, 1);
    }),
  },
  {
    id: "articulated-chart-desk",
    name: "Le pupitre des horizons",
    description:
      "Un bureau de navigation sur quatre pieds, avec carte azur, butée frontale et compas doré. Son plateau est présenté à plat, avec les deux articulations dégagées à l’arrière.",
    difficulty: "Créatif",
    theme: "objects",
    color: "#e4dfeb",
    previewRotation: 90,
    placements: layout((p) => {
      p("plate-4x6", "charcoal", 0, 1, 0);
      for (const x of [0, 3]) {
        for (const y of [1, 5]) {
          for (const z of [1, 4]) p("brick-1x2", "brown", x, y, z);
        }
        // The top rests on smooth front pads; they do not lock its free leaf.
        for (const z of [7, 8]) p("plate-1x2", "brown", x, 5, z);
        p("tile-1x2", "charcoal", x, 5, 9);
      }
      p("plate-1x4", "brown", 0, 2, 7, 90);
      for (const x of [0, 2]) p("special-hinge", undefined, x, 2, 8);
      p("plate-4x4", "brown", 0, 3, 10);
      p("plate-2x3", "blue", 1, 3, 11);
      p("tile-1x3", "blue", 1, 3, 12);
      p("tile-1x3", "ivory", 2, 3, 12);
      p("brick-1x4", "brown", 0, 6, 11, 90);
      p("tile-1x4", "yellow", 0, 6, 14, 90);
      p("round-1x1", "charcoal", 3, 3, 11);
      p("tile-1x1", "yellow", 3, 3, 14);
      p("round-1x1", "ivory", 0, 3, 11);
      p("slope-1x1", "yellow", 0, 3, 14, 90);
    }),
  },
];
