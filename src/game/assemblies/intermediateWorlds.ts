import type { ColorId } from "../catalog";
import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

type Add = Parameters<Parameters<typeof layout>[0]>[0];

/** Broad formats make the load-bearing courses; only keys, fruit and studs are 1 × 1. */
function line(
  p: Add,
  color: ColorId,
  x: number,
  y: number,
  z: number,
  length: number,
  alongX = false,
  kind = "brick",
) {
  const lengths = kind === "brick" ? [8, 6, 4, 3, 2, 1] : [4, 3, 2, 1];
  for (const size of lengths)
    while (length >= size) {
      p(`${kind}-1x${size}`, color, x, y, z, alongX ? 90 : 0);
      x += alongX ? size : 0;
      y += alongX ? 0 : size;
      length -= size;
    }
}

function floor(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
  stagger: boolean | "x" = false,
  broad = false,
) {
  const spans = (length: number, shifted: boolean) => {
    const result: number[] = [];
    if (shifted) {
      result.push(2);
      length -= 2;
    }
    if (broad)
      while (length >= 6) {
        result.push(6);
        length -= 6;
      }
    while (length >= 4) {
      result.push(4);
      length -= 4;
    }
    if (length) result.push(length);
    return result;
  };
  let dx = 0;
  for (const w of spans(width, Boolean(stagger))) {
    let dy = 0;
    for (const d of spans(depth, stagger === true)) {
      if (w > d) p(`plate-${d}x${w}`, color, x + dx, y + dy, z, 90);
      else p(`plate-${w}x${d}`, color, x + dx, y + dy, z);
      dy += d;
    }
    dx += w;
  }
}

function base(
  p: Add,
  width: number,
  depth: number,
  color: ColorId,
  broad = false,
) {
  floor(p, 0, 0, 0, width, depth, "charcoal", false, broad);
  floor(p, 0, 0, 1, width, depth, color, true, broad);
}

function blocks(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
) {
  for (let dx = 0; dx < width; dx += 2)
    for (let dy = 0; dy < depth; dy += 4)
      p(`brick-2x${Math.min(4, depth - dy)}`, color, x + dx, y + dy, z);
}

function rim(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
  cap = true,
) {
  for (const dy of [0, depth - 1]) {
    line(p, color, x, y + dy, z, width, true);
    if (cap) line(p, color, x, y + dy, z + 3, width, true, "tile");
  }
  for (const dx of [0, width - 1]) {
    line(p, color, x + dx, y + 1, z, depth - 2);
    if (cap) line(p, color, x + dx, y + 1, z + 3, depth - 2, false, "tile");
  }
}

function tree(
  p: Add,
  x: number,
  y: number,
  z: number,
  foliage: ColorId = "green",
  fruit: ColorId = "coral",
  height = 3,
) {
  for (let level = 0; level < height; level++)
    p("round-2x2", "brown", x + 1, y + 1, z + 3 * level);
  const crown = z + height * 3;
  p("plate-4x4", foliage, x, y, crown);
  p("brick-2x2", foliage, x + 1, y + 1, crown + 1);
  p("slope-1x2", foliage, x, y + 1, crown + 1, 180);
  p("slope-1x2", foliage, x + 3, y + 1, crown + 1);
  p("slope-1x2", foliage, x + 1, y, crown + 1, 270);
  p("slope-1x2", foliage, x + 1, y + 3, crown + 1, 90);
  p("plate-2x2", foliage, x + 1, y + 1, crown + 4);
  p("slope-1x2", foliage, x + 1, y + 1, crown + 5, 180);
  p("slope-1x2", foliage, x + 2, y + 1, crown + 5);
  for (const [dx, dy] of [
    [0, 0],
    [3, 3],
  ])
    p("round-1x1", fruit, x + dx, y + dy, crown + 1);
}

function plant(
  p: Add,
  x: number,
  y: number,
  z: number,
  bloom: ColorId = "coral",
  sideways = false,
) {
  p("round-2x2", "brown", x, y, z);
  p("round-1x1", "green", x, y, z + 3);
  p("plate-1x2", "green", x, y, z + 6, sideways ? 90 : 0);
  p("round-1x1", bloom, x, y, z + 7);
}

export const INTERMEDIATE_WORLD_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "waterlily-fountain",
    name: "La fontaine des nénuphars",
    description:
      "Un bassin carré bordé de pierre, quatre nénuphars fleuris et une fontaine centrale en étages. Les grandes plaques relient le fond du bassin.",
    difficulty: "Créatif",
    theme: "nature",
    color: "#dceee7",
    placements: layout((p) => {
      base(p, 12, 12, "green");
      floor(p, 2, 2, 2, 8, 8, "blue");
      rim(p, 1, 1, 2, 10, 10, "ivory");
      for (const x of [2, 8])
        for (const y of [2, 8]) {
          p("round-2x2", "green", x, y, 3);
          p("special-cross", "coral", x, y, 6);
          p("round-1x1", "yellow", x + 1, y + 1, 7);
        }
      p("round-4x4", "blue", 4, 4, 3);
      p("round-2x2", "ivory", 5, 5, 6);
      p("round-2x2", "blue", 5, 5, 9);
      p("special-cross", "blue", 4, 4, 12);
      p("round-1x1", "ivory", 5, 5, 13);
      for (const x of [0, 11])
        for (const y of [2, 8]) {
          p("brick-1x2", "brown", x, y, 2);
          p("tile-1x2", "brown", x, y, 5);
        }
    }),
  },
  {
    id: "chamber-organ",
    name: "L’orgue à sept registres",
    description:
      "Sept tuyaux de hauteurs différentes encadrent un clavier bicolore et son pupitre. Un petit instrument sculpté avec un véritable buffet en bois.",
    difficulty: "Créatif",
    theme: "objects",
    color: "#ecdfd3",
    placements: layout((p) => {
      base(p, 16, 8, "brown");
      for (const z of [2, 5]) line(p, "brown", 0, 0, z, 16, true);
      for (const x of [0, 15])
        for (const z of [2, 5, 8, 11]) p("brick-1x3", "brown", x, 1, z);
      for (let pipe = 0; pipe < 7; pipe++) {
        const height = 4 + Math.min(pipe, 6 - pipe);
        for (let level = 0; level < height; level++)
          p("round-1x2", "ivory", 1 + pipe * 2, 1, 2 + level * 3);
        p("tile-1x2", "charcoal", 1 + pipe * 2, 1, 2 + height * 3);
      }
      for (const x of [0, 8]) p("brick-2x8", "brown", x, 5, 2, 90);
      for (let key = 0; key < 16; key++) {
        p("plate-1x2", "ivory", key, 5, 5);
        p("tile-1x1", "ivory", key, 6, 6);
        if (![2, 6].includes(key % 7)) p("tile-1x1", "charcoal", key, 5, 6);
      }
      line(p, "brown", 0, 7, 2, 16, true);
      for (const x of [6, 8]) p("slope-2x2", "brown", x, 3, 2, 270);
    }),
  },
  {
    id: "terraced-waterfall",
    name: "La cascade des rochers",
    description:
      "Un ruisseau descend sur trois terrasses de pierre, franchit trois lèvres d’écume et rejoint un bassin bordé d’arbres et de fleurs.",
    difficulty: "Expert",
    theme: "nature",
    color: "#dfece8",
    placements: layout((p) => {
      base(p, 18, 18, "green");
      // Broad stone courses recede into the hill instead of forming two towers.
      for (const z of [2, 5]) blocks(p, 2, 0, z, 14, 10, "charcoal");
      for (const z of [8, 11]) blocks(p, 3, 0, z, 12, 7, "charcoal");
      for (const z of [14, 17]) blocks(p, 5, 0, z, 8, 4, "charcoal");
      // Thin, wide water faces attach to each lower landing. Horizontal pools
      // separate the drops so the stream reads as three real cascades.
      for (const [y, bottom] of [
        [4, 14],
        [7, 8],
        [10, 2],
      ]) {
        for (const z of [bottom, bottom + 3])
          p("brick-1x4", "blue", 7, y, z, 90);
        p("tile-1x4", "ivory", 7, y, bottom + 6, 90);
      }
      for (const [y, z] of [
        [0, 20],
        [2, 20],
        [5, 14],
        [8, 8],
      ])
        p("tile-2x4", "blue", 7, y, z, 90);
      floor(p, 6, 11, 2, 6, 4, "blue");
      p("tile-1x4", "ivory", 7, 11, 3, 90);
      for (const y of [0, 2]) {
        p("slope-2x2", "charcoal", 5, y, 20, 180);
        p("slope-2x2", "charcoal", 11, y, 20);
      }
      p("slope-2x2", "charcoal", 3, 5, 14, 180);
      p("round-2x2", "ivory", 5, 5, 14);
      p("slope-2x2", "charcoal", 12, 5, 14);
      for (const x of [2, 4, 12])
        p("slope-2x2", "charcoal", x, 8, 8, x < 7 ? 180 : 0);
      p("round-2x2", "ivory", 14, 8, 8);
      for (const x of [0, 14])
        for (const y of [10, 14])
          tree(p, x, y, 2, "green", "coral", y === 10 ? 3 : 2);
      for (const x of [4, 12])
        for (const y of [13, 16])
          plant(p, x, y, 2, y === 13 ? "violet" : "yellow");
      for (const x of [6, 10]) p("slope-2x2", "charcoal", x, 16, 2, 90);
    }),
  },
  {
    id: "cargo-shuttle",
    previewRotation: 180,
    name: "La navette des confins",
    description:
      "Une sculpture de navette à coque épaisse, larges ailes en gradins, cockpit incliné, deux réacteurs verticaux et soute à trois modules.",
    difficulty: "Expert",
    theme: "vehicles",
    color: "#dce7f1",
    placements: layout((p) => {
      base(p, 8, 28, "charcoal");
      for (const x of [0, 6])
        for (const y of [0, 8, 16]) p("brick-2x8", "ivory", x, y, 2);
      for (const x of [0, 6]) p("brick-2x4", "ivory", x, 24, 2);
      floor(p, 0, 0, 5, 8, 28, "blue");
      for (const x of [-4, 6]) p("plate-6x6", "blue", x, 10, 6);
      for (const x of [-7, 11]) p("plate-4x6", "blue", x, 12, 7);
      for (const x of [-7, 13])
        for (const y of [12, 16]) p("tile-2x2", "yellow", x, y, 8);
      for (const x of [-2, 8])
        p("slope-2x4", "ivory", x, 10, 7, x < 0 ? 180 : 0);
      for (const z of [6, 9]) blocks(p, 2, 2, z, 4, 4, "ivory");
      floor(p, 2, 2, 12, 4, 4, "ivory");
      p("slope-2x4", "charcoal", 2, 2, 13, 270);
      p("slope-2x4", "charcoal", 2, 4, 13, 90);
      for (const x of [2, 4])
        for (const y of [6, 14]) {
          for (const z of [6, 9]) p("brick-2x8", "ivory", x, y, z);
          p("plate-2x8", "ivory", x, y, 12);
        }
      for (const y of [6, 10, 14, 18]) {
        p("slope-2x4", "ivory", 2, y, 13, 180);
        p("slope-2x4", "ivory", 4, y, 13);
      }
      for (const x of [0, 4]) {
        for (const z of [6, 9, 12]) p("round-4x4", "charcoal", x, 24, z);
        p("round-2x2", "orange", x + 1, 25, 15);
      }
      for (const x of [0, 6])
        for (const y of [0, 4, 8, 12, 16, 20]) {
          const z = [8, 12].includes(y) ? 7 : 6;
          p("slope-2x4", "ivory", x, y, z, x === 0 ? 180 : 0);
        }
      for (const z of [6, 9, 12, 15, 18]) p("brick-1x3", "blue", 3, 23, z, 90);
      p("tile-1x3", "yellow", 3, 23, 21, 90);
      for (const x of [2, 4]) p("slope-2x2", "blue", x, 0, 6, 270);
      // A supported tapered prow breaks up the old rectangular cargo silhouette.
      p("plate-2x6", "blue", 3, -2, 2);
      p("brick-2x2", "blue", 3, -2, 3);
      p("slope-2x2", "blue", 3, -2, 6, 270);
    }),
  },
  {
    id: "ocean-schooner",
    name: "La goélette du grand large",
    description:
      "Une grande sculpture de voilier à deux mâts : coque bordée, pont en bois, cabine arrière et deux voiles triangulaires construites en vraies rangées de briques.",
    difficulty: "Expert",
    theme: "vehicles",
    color: "#e2e9ef",
    placements: layout((p) => {
      // The prow narrows in two courses; staggered plates join it to the hull.
      floor(p, 2, 0, 0, 4, 4, "blue");
      floor(p, 1, 4, 0, 6, 4, "blue");
      floor(p, 0, 8, 0, 8, 20, "blue");
      for (const x of [2, 4])
        for (const y of [0, 6]) p("plate-2x6", "blue", x, y, 1);
      for (const x of [0, 6]) p("plate-2x4", "blue", x, 8, 1);
      for (const x of [1, 6]) p("plate-1x4", "blue", x, 4, 1);
      floor(p, 0, 12, 1, 8, 16, "blue", true);
      line(p, "blue", 2, 0, 2, 4, true);
      for (const x of [2, 5]) line(p, "blue", x, 1, 2, 3);
      for (const x of [1, 6]) line(p, "blue", x, 4, 2, 4);
      for (const x of [0, 7]) line(p, "blue", x, 8, 2, 20);
      line(p, "blue", 1, 27, 2, 6, true);
      floor(p, 2, 0, 5, 4, 4, "brown");
      floor(p, 1, 4, 5, 6, 4, "brown");
      floor(p, 0, 8, 5, 8, 20, "brown");
      for (const y of [8, 17]) {
        // Sloped outer pieces form a continuous diagonal on each triangular sail.
        for (let row = 0; row < 8; row++) {
          const length = 8 - row;
          line(p, "ivory", 0, y, 6 + row * 3, length - 1, true);
          p("slope-1x1", "ivory", length - 1, y, 6 + row * 3);
        }
        for (let z = 6; z < 42; z += 3) p("brick-1x2", "brown", 1, y - 2, z);
        p("plate-1x3", "brown", 0, y - 1, 42, 90);
        p("tile-1x3", "coral", 0, y - 1, 43, 90);
      }
      for (const x of [0, 7])
        for (const y of [11, 21, 25]) {
          p("brick-1x2", "brown", x, y, 6);
          p("tile-1x2", "ivory", x, y, 9);
        }
      for (const z of [6, 9]) {
        for (const x of [1, 6]) p("brick-1x4", "ivory", x, 22, z);
        line(p, "ivory", 2, 25, z, 4, true);
      }
      for (const x of [2, 4]) p("special-window", "blue", x, 22, 6, 90);
      floor(p, 0, 22, 12, 8, 4, "blue");
      for (const x of [0, 4]) p("tile-2x4", "ivory", x, 23, 13, 90);
      for (const x of [2, 4]) p("slope-2x2", "blue", x, 0, 6, 270);
      for (const x of [1, 5])
        for (const y of [9, 18]) {
          p("round-2x2", "brown", x, y, 6);
          p("tile-2x2", "brown", x, y, 9);
        }
      for (const y of [3, 12, 20]) {
        p("plate-2x4", "brown", 2, y, 6, 90);
        p("tile-2x4", "brown", 2, y, 7, 90);
      }
    }),
  },
  {
    id: "grand-chessboard",
    name: "Le grand échiquier",
    description:
      "Un plateau de 64 cases et ses 32 pièces en position initiale. Les pions, tours, cavaliers, fous, reines et rois ont chacun leur silhouette et restent attachés au plateau.",
    difficulty: "Expert",
    theme: "objects",
    color: "#e9e5db",
    placements: layout((p) => {
      base(p, 20, 20, "brown");
      rim(p, 0, 0, 2, 20, 20, "brown");
      for (let file = 0; file < 8; file++)
        for (let rank = 0; rank < 8; rank++) {
          const x = 2 + file * 2,
            y = 2 + rank * 2;
          const square: ColorId = (file + rank) % 2 ? "brown" : "ivory";
          p("plate-2x2", square, x, y, 2);
          if (rank >= 2 && rank <= 5) {
            p("tile-2x2", square, x, y, 3);
            continue;
          }
          const color: ColorId = rank < 2 ? "ivory" : "charcoal";
          p("round-2x2", color, x, y, 3);
          p("plate-2x2", color, x, y, 6);
          if (rank === 1 || rank === 6) {
            p("round-1x1", color, x, y, 7);
            p("plate-1x1", color, x, y, 10);
          } else if (file === 0 || file === 7) {
            p("brick-2x2", color, x, y, 7);
            p("plate-2x2", color, x, y, 10);
            p("brick-1x2", color, x, y, 11);
            p("brick-1x2", color, x + 1, y, 11);
          } else if (file === 1 || file === 6) {
            p("brick-1x2", color, x, y, 7);
            p("plate-1x2", color, x, y, 10);
            p("brick-1x1", color, x, y + 1, 11);
            p("slope-1x2", color, x, y, 14);
          } else if (file === 2 || file === 5) {
            p("round-1x1", color, x, y, 7);
            p("round-1x1", color, x, y, 10);
            p("slope-1x1", color, x, y, 13);
          } else {
            p("round-1x1", color, x, y, 7);
            p("round-1x1", color, x, y, 10);
            p("plate-1x2", color, x, y, 13);
            p("round-1x1", color, x, y, 14);
            if (file === 4) {
              p("plate-1x2", color, x, y, 17, 90);
              p("round-1x1", color, x, y, 18);
            }
          }
        }
    }),
  },
  {
    id: "concert-grand-piano",
    name: "Le piano de concert",
    description:
      "Un piano à queue sur trois pieds, avec une caisse noire effilée, des cordes dorées et un clavier bicolore visible à l'avant. Son couvercle ouvert se dresse sur le côté.",
    difficulty: "Expert",
    theme: "objects",
    color: "#e9e3da",
    placements: layout((p) => {
      // Three visible legs and interlocking rails carry every plate of the case.
      for (const [x, y] of [
        [0, 0],
        [0, 14],
        [8, 14],
      ]) {
        p("plate-4x4", "charcoal", x, y, 0);
        for (const z of [1, 4, 7, 10])
          p("brick-2x2", "charcoal", x + 1, y + 1, z);
      }
      p("plate-2x8", "charcoal", 1, 0, 13);
      p("plate-2x8", "charcoal", 1, 8, 13);
      p("plate-2x8", "charcoal", 9, 8, 13);
      p("plate-2x8", "charcoal", 3, 16, 13, 90);
      const panels: [number, number][] = [
        [0, 0],
        [0, 6],
        [6, 6],
        [0, 12],
        [6, 12],
      ];
      for (const [x, y] of panels) p("plate-6x6", "charcoal", x, y, 14);
      floor(p, 0, 0, 15, 6, 6, "charcoal", "x", true);
      floor(p, 0, 6, 15, 12, 12, "charcoal", true, true);
      for (const [x, y] of panels) p("plate-6x6", "brown", x, y, 16);

      for (let key = 0; key < 10; key++) {
        p("plate-1x3", "ivory", key + 1, 14, 17);
        p("tile-1x2", "ivory", key + 1, 15, 18);
        if (![2, 6].includes(key % 7))
          p("tile-1x1", "charcoal", key + 1, 14, 18);
      }
      for (const x of [1, 3]) line(p, "yellow", x, 2, 17, 11, false, "plate");
      for (const x of [5, 7, 9]) line(p, "yellow", x, 7, 17, 6, false, "plate");
      for (const [x, y, length, alongX] of [
        [0, 0, 18, false],
        [5, 0, 6, false],
        [1, 0, 4, true],
        [6, 6, 5, true],
        [11, 6, 12, false],
      ] as const) {
        line(p, "charcoal", x, y, 17, length, alongX);
        if (x !== 0) line(p, "charcoal", x, y, 20, length, alongX, "tile");
      }
      line(p, "charcoal", 0, 0, 20, 3, false, "tile");
      line(p, "charcoal", 0, 14, 20, 4, false, "tile");
      line(p, "charcoal", 1, 17, 17, 10, true, "tile");
      // An open lid rises above the strings; it is attached to the straight rim.
      for (const z of [20, 23, 26, 29]) line(p, "charcoal", 0, 3, z, 11);
      line(p, "charcoal", 0, 3, 32, 11, false, "tile");
    }),
  },
  {
    id: "four-seasons-garden",
    name: "Le jardin des quatre saisons",
    description:
      "Quatre vergers de couleurs différentes entourent une place centrale et son kiosque ouvert. Des massifs fleuris, des bancs et des allées relient les quatre saisons.",
    difficulty: "Expert",
    theme: "nature",
    color: "#e5eadb",
    placements: layout((p) => {
      base(p, 28, 28, "green", true);
      const quarters: [number, number, ColorId, ColorId][] = [
        [1, 1, "mint", "coral"],
        [19, 1, "green", "yellow"],
        [1, 19, "orange", "coral"],
        [19, 19, "ivory", "blue"],
      ];
      for (const [x, y, foliage, fruit] of quarters) {
        for (const dx of [0, 5])
          for (const dy of [0, 5])
            tree(p, x + dx, y + dy, 2, foliage, fruit, dx === dy ? 3 : 2);
        for (const dx of [0, 3, 6])
          plant(p, x + dx, y < 10 ? 0 : 17, 2, fruit, true);
      }
      floor(p, 10, 10, 2, 8, 8, "ivory");
      for (const x of [10, 16])
        for (const y of [10, 16])
          for (const z of [3, 6, 9]) p("brick-2x2", "brown", x, y, z);
      floor(p, 10, 10, 12, 8, 8, "brown");
      for (const y of [10, 14]) {
        p("slope-2x4", "coral", 10, y, 13, 180);
        p("slope-2x4", "coral", 16, y, 13);
        p("brick-4x4", "coral", 12, y, 13);
      }
      floor(p, 12, 10, 16, 4, 8, "coral");
      for (const y of [10, 14]) {
        p("slope-2x4", "coral", 12, y, 17, 180);
        p("slope-2x4", "coral", 14, y, 17);
      }
      for (const y of [0, 4, 20, 24]) p("tile-2x4", "ivory", 13, y, 2);
      for (const x of [0, 4, 20, 24]) p("tile-2x4", "ivory", x, 13, 2, 90);
      for (const x of [10, 17])
        for (const y of [3, 21]) {
          p("brick-1x4", "brown", x, y, 2);
          p("tile-1x4", "brown", x, y, 5);
        }
    }),
  },
  {
    id: "cargo-harbor",
    name: "Le terminal des marées",
    description:
      "Un diorama portuaire complet : cargo à six conteneurs, quai pavé, grande grue portique et dépôt. La coque et les bâtiments sont tous reliés au socle marin.",
    difficulty: "Expert",
    theme: "vehicles",
    color: "#dce8ee",
    placements: layout((p) => {
      base(p, 36, 32, "blue", true);
      // Raised dock, built from broad two-stud girders and a paved deck.
      for (const z of [2, 5]) blocks(p, 0, 0, z, 12, 32, "charcoal");
      floor(p, 0, 0, 8, 12, 32, "ivory");
      for (let x = 0; x < 12; x += 4)
        for (let y = 0; y < 24; y += 4) {
          if ([0, 8].includes(x) && [4, 20].includes(y)) continue;
          p("tile-4x4", "ivory", x, y, 9);
        }
      // The cargo hull visibly narrows to a stepped bow.
      blocks(p, 18, 5, 2, 12, 20, "blue");
      blocks(p, 18, 5, 5, 12, 20, "coral");
      floor(p, 18, 5, 8, 12, 20, "brown");
      for (const [y, width, x] of [
        [1, 4, 22],
        [3, 8, 20],
        [25, 8, 20],
        [27, 4, 22],
      ]) {
        for (const z of [2, 5]) blocks(p, x, y, z, width, 2, "blue");
        floor(p, x, y, 8, width, 2, "brown");
      }
      for (const x of [19, 24])
        for (const y of [7, 12, 17]) {
          const color: ColorId =
            y === 12 ? "orange" : x === 19 ? "mint" : "coral";
          for (const z of [9, 12]) blocks(p, x, y, z, 4, 4, color);
          floor(p, x, y, 15, 4, 4, color);
          for (const dx of [0, 2]) p("tile-2x4", "ivory", x + dx, y, 16);
        }
      // A deckhouse has real window frames and a broad attached roof.
      for (const x of [20, 26])
        for (const z of [9, 12, 15]) p("brick-2x4", "ivory", x, 22, z);
      for (const x of [22, 24]) {
        p("special-window", "blue", x, 22, 9, 90);
        p("brick-1x2", "ivory", x, 22, 15, 90);
      }
      for (const z of [9, 12, 15]) line(p, "ivory", 22, 25, z, 4, true);
      floor(p, 20, 22, 18, 8, 4, "charcoal");
      p("round-2x2", "orange", 23, 23, 19);
      for (const y of [5, 9, 13, 17, 21])
        for (const x of [18, 29]) {
          p("brick-1x3", "brown", x, y, 9);
          p("tile-1x3", "ivory", x, y, 12);
        }
      // The open crane frame rises from bare studded pads beside the smooth paving.
      for (const y of [4, 20])
        for (const x of [2, 8]) {
          p("plate-2x2", "yellow", x, y, 9);
          for (const z of [10, 13, 16, 19, 22, 25, 28])
            p("brick-2x2", "yellow", x, y, z);
        }
      for (const y of [4, 20])
        for (let tier = 0; tier < 4; tier++) {
          p("plate-2x8", "yellow", 2 + tier * 6, y, 31 + tier, 90);
        }
      for (const y of [4, 14]) p("plate-2x8", "yellow", 2, y, 32);
      p("plate-2x8", "yellow", 2, 9, 33);
      for (const y of [4, 20]) {
        p("brick-2x2", "charcoal", 24, y, 35);
        p("tile-2x2", "yellow", 24, y, 38);
      }
      // Two low warehouse bays fill the rear quay without hiding the ship.
      for (const y of [26])
        for (const x of [1, 6]) {
          for (const z of [9, 12, 15]) blocks(p, x, y, z, 4, 4, "brown");
          floor(p, x, y, 18, 4, 4, "charcoal");
          p("tile-2x4", "coral", x + 1, y, 19);
        }
    }),
  },
  {
    id: "tropical-conservatory",
    name: "La serre des tropiques",
    description:
      "Quatre fermes en pente et un long faîtage dessinent une vraie serre ajourée. Les ouvertures du toit laissent admirer douze arbres tropicaux et les allées fleuries.",
    difficulty: "Expert",
    theme: "nature",
    color: "#dfece3",
    placements: layout((p) => {
      base(p, 28, 32, "green", true);
      for (const x of [3, 11, 19])
        for (const y of [3, 10, 17, 24])
          tree(
            p,
            x,
            y,
            2,
            y === 17 ? "mint" : "green",
            y === 10 ? "orange" : "yellow",
            4,
          );
      for (const x of [8, 16, 24])
        for (const y of [3, 7, 11, 15, 19, 23, 27])
          plant(p, x, y, 2, y % 3 ? "coral" : "violet");
      for (const y of [0, 31]) {
        for (const z of [2, 5]) line(p, "ivory", 0, y, z, 28, true);
        for (let x = 0; x < 28; x += 4) {
          for (const z of [8, 11, 14, 17]) p("brick-1x2", "ivory", x, y, z, 90);
          for (const z of [8, 14]) p("special-window", "mint", x + 2, y, z, 90);
        }
        line(p, "ivory", 0, y, 20, 28, true);
      }
      for (const x of [0, 27]) {
        for (const z of [2, 5]) line(p, "ivory", x, 1, z, 30);
        for (let y = 1; y < 29; y += 4) {
          for (const z of [8, 11, 14, 17]) p("brick-1x2", "ivory", x, y, z);
          for (const z of [8, 14]) p("special-window", "mint", x, y + 2, z);
        }
        for (const z of [8, 11, 14, 17]) p("brick-1x2", "ivory", x, 29, z);
        line(p, "ivory", x, 1, 20, 30);
      }
      // Every rising rafter overlaps two studs of its predecessor. Slopes cap
      // only the exposed ledge, leaving the inner studs free for the next step.
      for (const y of [0, 9, 20, 31]) {
        for (let tier = 0; tier < 6; tier++) {
          const z = 23 + tier * 3;
          p("brick-1x4", "brown", tier * 2, y, z, 90);
          p("brick-1x4", "brown", 24 - tier * 2, y, z, 90);
          p("slope-2x2", "ivory", tier * 2, y, z + 3, 180);
          p("slope-2x2", "ivory", 26 - tier * 2, y, z + 3);
        }
        p("brick-1x4", "brown", 12, y, 41, 90);
      }
      // Two staggered plate courses connect all four trusses along the ridge.
      for (const y of [0, 8, 16, 24]) p("plate-2x8", "ivory", 13, y, 44);
      for (const y of [4, 12, 20]) p("plate-2x8", "ivory", 13, y, 45);
      for (const y of [0, 28]) p("tile-2x4", "ivory", 13, y, 45);
      for (const y of [4, 8, 12, 16, 20, 24]) p("tile-2x4", "ivory", 13, y, 46);
      for (const x of [7, 15])
        for (let y = 1; y < 29; y += 4) p("tile-1x4", "ivory", x, y, 2);
    }),
  },
];
