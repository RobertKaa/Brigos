import type { ColorId } from "../catalog";
import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

type Add = Parameters<Parameters<typeof layout>[0]>[0];

/** Long, straight courses use the longest available brick, including corners. */
function line(
  p: Add,
  x: number,
  y: number,
  z: number,
  length: number,
  color: ColorId,
  alongX = false,
) {
  let used = 0;
  for (const size of [8, 6, 4, 3, 2, 1]) {
    while (length - used >= size) {
      p(
        `brick-1x${size}`,
        color,
        x + (alongX ? used : 0),
        y + (alongX ? 0 : used),
        z,
        alongX ? 90 : 0,
      );
      used += size;
    }
  }
}

/** Two crossed courses connect adjacent base plates without a field of 1 × 1s. */
function base(p: Add, width: number, depth: number, color: ColorId = "green") {
  for (let x = 0; x < width; x += 6)
    for (let y = 0; y < depth; y += 6) p("plate-6x6", color, x, y, 0);
  for (let x = 3; x < width - 6; x += 6)
    for (let y = 3; y < depth - 6; y += 6) p("plate-6x6", color, x, y, 1);
}

function floor(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
) {
  const w = width % 6 === 0 ? 6 : 4;
  const d = depth % 6 === 0 ? 6 : 4;
  for (let dx = 0; dx < width; dx += w)
    for (let dy = 0; dy < depth; dy += d)
      p(
        w === 6 && d === 6
          ? "plate-6x6"
          : w === 4 && d === 4
            ? "plate-4x4"
            : "plate-4x6",
        color,
        x + dx,
        y + dy,
        z,
        w === 6 && d === 4 ? 90 : 0,
      );
}

function perimeter(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
) {
  for (const dy of [0, depth - 1]) line(p, x, y + dy, z, width, color, true);
  for (const dx of [0, width - 1]) line(p, x + dx, y + 1, z, depth - 2, color);
}

/** Window frames replace masonry; their empty centres are not filled with bricks. */
function facade(
  p: Add,
  x: number,
  y: number,
  z: number,
  length: number,
  color: ColorId,
  glass: ColorId,
  alongX: boolean,
  entrance = false,
  arched = false,
) {
  const at = (offset: number) =>
    [x + (alongX ? offset : 0), y + (alongX ? 0 : offset)] as const;
  if (arched) {
    const opening = length === 8 ? 4 : 6;
    const cheek = (length - opening) / 2;
    line(p, x, y, z, length, color, alongX);
    if (cheek)
      for (const dz of [3, 6]) {
        line(p, x, y, z + dz, cheek, color, alongX);
        const [rx, ry] = at(length - cheek);
        line(p, rx, ry, z + dz, cheek, color, alongX);
      }
    const [ax, ay] = at(cheek);
    p(`arch-1x${opening}`, color, ax, ay, z + 3, alongX ? 90 : 0);
    line(p, x, y, z + 9, length, color, alongX);
    return;
  }
  if (entrance) {
    const door = Math.floor(length / 2) - 1;
    const [dx, dy] = at(door);
    p("special-door", "brown", dx, dy, z, alongX ? 90 : 0);
    for (const dz of [0, 3, 6]) {
      line(p, x, y, z + dz, door, color, alongX);
      const [rx, ry] = at(door + 3);
      line(p, rx, ry, z + dz, length - door - 3, color, alongX);
    }
  } else {
    line(p, x, y, z, length, color, alongX);
    let offset = 0;
    for (let opening = 2; opening < length - 2; opening += 4) {
      for (const dz of [3, 6]) {
        const [px, py] = at(offset);
        line(p, px, py, z + dz, opening - offset, color, alongX);
      }
      const [wx, wy] = at(opening);
      p("special-window", glass, wx, wy, z + 3, alongX ? 90 : 0);
      offset = opening + 2;
    }
    for (const dz of [3, 6]) {
      const [px, py] = at(offset);
      line(p, px, py, z + dz, length - offset, color, alongX);
    }
  }
  line(p, x, y, z + 9, length, color, alongX);
}

function storey(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
  glass: ColorId,
  entrance = false,
  arched = false,
) {
  facade(p, x, y, z, width, color, glass, true, false, arched);
  facade(p, x, y + depth - 1, z, width, color, glass, true, entrance, arched);
  for (const dx of [0, width - 1])
    facade(p, x + dx, y + 1, z, depth - 2, color, glass, false, false, arched);
}

/** A brick core carries each upper ridge: smooth slopes never support another part. */
function roof(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
  clock = false,
) {
  const ridgeZ = z + ((width - 4) / 4) * 4;
  for (let inset = 0; width - inset * 2 >= 4; inset += 2, z += 4) {
    for (let dy = 0; dy < depth; dy += 4) {
      if (clock && width - inset * 2 === 4 && dy === depth - 4) continue;
      p("slope-2x4", color, x + inset, y + dy, z, 180);
      p("slope-2x4", color, x + width - inset - 2, y + dy, z);
      for (let dx = inset + 2; dx < width - inset - 2; dx += 4)
        p("brick-4x4", color, x + dx, y + dy, z);
    }
    if (width - inset * 2 > 4)
      floor(p, x + inset + 2, y, z + 3, width - inset * 2 - 4, depth, color);
  }
  if (clock) {
    const cx = x + (width - 4) / 2;
    const cy = y + depth - 4;
    // A ridge module replaces smooth slopes and really supports the clock tower.
    p("brick-4x4", color, cx, cy, ridgeZ);
    p("plate-4x4", "yellow", cx, cy, ridgeZ + 3);
    // The clock is a structural mosaic through the tower's whole depth,
    // giving both platform and street facades an attached, visible pair of hands.
    p("brick-2x4", "ivory", cx, cy, ridgeZ + 4);
    p("brick-1x4", "charcoal", cx + 2, cy, ridgeZ + 4);
    p("brick-1x4", "ivory", cx + 3, cy, ridgeZ + 4);
    p("brick-1x4", "ivory", cx, cy, ridgeZ + 7);
    p("brick-2x4", "charcoal", cx + 1, cy, ridgeZ + 7);
    p("brick-1x4", "ivory", cx + 3, cy, ridgeZ + 7);
    p("brick-4x4", "ivory", cx, cy, ridgeZ + 10);
    p("plate-4x4", color, cx, cy, ridgeZ + 13);
    p("slope-2x4", color, cx, cy, ridgeZ + 14, 180);
    p("slope-2x4", color, cx + 2, cy, ridgeZ + 14);
  }
}

function parapet(
  p: Add,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  color: ColorId,
) {
  perimeter(p, x, y, z, width, depth, color);
  for (const dx of [0, width - 2])
    for (const dy of [0, depth - 2])
      p("brick-2x2", color, x + dx, y + dy, z + 3);
  for (let dx = 4; dx < width - 2; dx += 4)
    for (const dy of [0, depth - 1])
      p("brick-1x2", color, x + dx, y + dy, z + 3, 90);
  for (let dy = 4; dy < depth - 2; dy += 4)
    for (const dx of [0, width - 1])
      p("brick-1x2", color, x + dx, y + dy, z + 3);
}

function building(
  p: Add,
  x: number,
  y: number,
  width: number,
  depth: number,
  floors: number,
  wall: ColorId,
  glass: ColorId,
  top: ColorId,
  options: {
    terrace?: boolean;
    entrance?: boolean;
    clock?: boolean;
    arched?: boolean;
  } = {},
) {
  for (let level = 0; level < floors; level++) {
    storey(
      p,
      x,
      y,
      2 + level * 13,
      width,
      depth,
      wall,
      glass,
      options.entrance && level === 0,
      options.arched,
    );
    floor(
      p,
      x,
      y,
      14 + level * 13,
      width,
      depth,
      level === floors - 1 ? top : "ivory",
    );
  }
  const z = 2 + floors * 13;
  if (options.terrace) parapet(p, x, y, z, width, depth, wall);
  else roof(p, x, y, z, width, depth, top, options.clock);
}

function bench(p: Add, x: number, y: number, z = 2) {
  for (const dx of [0, 3]) p("brick-1x2", "brown", x + dx, y, z);
  p("plate-2x4", "brown", x, y, z + 3, 90);
  for (const dx of [0, 3]) p("brick-1x1", "brown", x + dx, y, z + 4);
  p("brick-1x4", "green", x, y, z + 7, 90);
}

function tree(p: Add, x: number, y: number, z = 2) {
  for (const dz of [0, 3]) p("round-2x2", "brown", x + 1, y + 1, z + dz);
  p("round-4x4", "green", x, y, z + 6);
  p("round-2x2", "mint", x + 1, y + 1, z + 9);
}

export const INTERMEDIATE_ARCHITECTURE_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "winter-garden",
    name: "Le pavillon des plantes",
    description:
      "Une pergola sous quatre arches, avec des massifs, deux bancs et une charpente qui laisse voir les plantes.",
    difficulty: "Créatif",
    color: "#e0eee8",
    placements: layout((p) => {
      base(p, 18, 12);
      for (const y of [3, 8]) {
        for (const x of [3, 8, 9, 14])
          for (const z of [2, 5]) p("brick-1x2", "ivory", x, y, z);
        for (const x of [3, 9]) p("arch-1x6", "ivory", x, y, 8, 90);
        line(p, 3, y, 14, 12, "brown", true);
      }
      for (const x of [3, 6, 9, 12]) p("plate-2x6", "brown", x, 3, 17);
      for (const x of [5, 11]) {
        p("plate-2x4", "brown", x, 5, 2, 90);
        for (const dx of [0, 2]) {
          p("round-1x1", "brown", x + dx, 6, 3);
          p("round-1x1", "green", x + dx, 6, 6);
          p("round-1x1", dx ? "yellow" : "coral", x + dx, 6, 9);
        }
      }
      bench(p, 4, 10, 1);
      bench(p, 10, 10, 1);
    }),
  },
  {
    id: "harbour-lighthouse",
    name: "Le phare du port",
    description:
      "Un phare rayé, une haute lanterne visible sous son toit pyramidal et une petite maison de gardien accolée au quai.",
    difficulty: "Créatif",
    color: "#e0eaf3",
    placements: layout((p) => {
      base(p, 18, 18, "blue");
      for (let level = 0; level < 8; level++)
        perimeter(p, 4, 4, 2 + level * 3, 4, 4, level % 2 ? "coral" : "ivory");
      p("plate-6x6", "ivory", 3, 3, 26);
      for (const [x, y] of [
        [3, 5],
        [8, 5],
        [5, 3],
        [5, 8],
      ])
        for (const z of [27, 30, 33, 36]) p("brick-1x1", "charcoal", x, y, z);
      for (const z of [27, 30, 33, 36]) p("round-2x2", "yellow", 5, 5, z);
      p("plate-6x6", "charcoal", 3, 3, 39);
      p("brick-2x2", "charcoal", 5, 5, 40);
      for (const y of [3, 5, 7]) {
        p("slope-2x2", "charcoal", 3, y, 40, 180);
        p("slope-2x2", "charcoal", 7, y, 40);
      }
      p("slope-2x2", "charcoal", 5, 3, 40, 270);
      p("slope-2x2", "charcoal", 5, 7, 40, 90);
      p("plate-2x2", "charcoal", 5, 5, 43);
      p("round-2x2", "charcoal", 5, 5, 44);
      building(p, 10, 3, 4, 8, 1, "ivory", "blue", "coral", { entrance: true });
      for (const x of [4, 8, 12]) p("tile-2x4", "brown", x, 12, 2, 90);
      for (const x of [3, 15])
        for (const y of [11, 15])
          p("round-1x1", "charcoal", x, y, x === 15 || y === 15 ? 1 : 2);
    }),
  },
  {
    id: "star-observatory",
    name: "L’observatoire des étoiles",
    description:
      "Deux étages de recherche dominés par une coupole violette et un télescope sculpté à objectif bleu, avec une galerie ouverte et un jardin nocturne.",
    difficulty: "Expert",
    color: "#e6def0",
    placements: layout((p) => {
      base(p, 18, 18, "charcoal");
      building(p, 3, 3, 12, 8, 2, "ivory", "violet", "charcoal", {
        terrace: true,
        entrance: true,
      });
      p("plate-6x6", "violet", 6, 4, 28);
      p("round-4x4", "violet", 7, 5, 29);
      p("round-2x2", "violet", 8, 6, 32);
      p("round-2x2", "charcoal", 8, 6, 35);
      p("plate-1x4", "ivory", 8, 6, 38, 90);
      p("brick-1x3", "charcoal", 8, 6, 39, 90);
      p("brick-1x2", "blue", 11, 6, 39);
      for (const x of [3, 11]) tree(p, x, 11);
      bench(p, 7, 13);
      for (const x of [7, 9]) p("tile-2x2", "yellow", x, 11, 2);
    }),
  },
  {
    id: "travellers-station",
    name: "La gare des voyageurs",
    description:
      "Une horloge à aiguilles sculptées domine le pavillon central de cette gare, avec deux ailes, un quai couvert d’arches et des voies suggérées en tuiles sombres.",
    difficulty: "Expert",
    color: "#f3e6ce",
    placements: layout((p) => {
      base(p, 30, 18, "ivory");
      building(p, 3, 3, 8, 8, 1, "yellow", "blue", "charcoal", {
        entrance: true,
      });
      building(p, 11, 3, 8, 8, 2, "ivory", "blue", "charcoal", {
        entrance: true,
        clock: true,
      });
      building(p, 19, 3, 8, 8, 1, "yellow", "blue", "charcoal", {
        entrance: true,
      });
      for (const x of [3, 9, 15, 21]) {
        for (const dx of [0, 5])
          for (const z of [2, 5]) p("brick-1x1", "brown", x + dx, 12, z);
        p("arch-1x6", "ivory", x, 12, 8, 90);
        p("plate-2x6", "charcoal", x, 12, 14, 90);
      }
      for (const y of [15, 17])
        for (let x = 2; x < 26; x += 4) p("tile-1x4", "charcoal", x, y, 1, 90);
      bench(p, 5, 13, 2);
      bench(p, 22, 13, 2);
    }),
  },
  {
    id: "arcade-bookshop",
    name: "La librairie des arcades",
    description:
      "Trois étages colorés, une toiture en pente, deux rayonnages sur le parvis et une galerie d’arches qui abrite les lecteurs.",
    difficulty: "Expert",
    color: "#f0dfd2",
    placements: layout((p) => {
      base(p, 24, 18, "ivory");
      building(p, 3, 3, 16, 8, 3, "coral", "blue", "brown", { entrance: true });
      for (const x of [3, 9, 15]) {
        for (const dx of [0, 5])
          for (const z of [2, 5]) p("brick-1x2", "ivory", x + dx, 12, z);
        p("arch-1x6", "ivory", x, 12, 8, 90);
        p("plate-2x6", "brown", x, 12, 14, 90);
      }
      const books: ColorId[] = ["blue", "yellow", "mint", "violet"];
      for (const x of [4, 12]) {
        p("plate-2x6", "brown", x, 14, 2, 90);
        for (const z of [3, 7]) {
          for (const dx of [0, 5]) p("brick-1x2", "brown", x + dx, 14, z);
          for (let dx = 1; dx < 5; dx++)
            p("brick-1x2", books[dx - 1], x + dx, 14, z);
          p("plate-2x6", "brown", x, 14, z + 3, 90);
        }
      }
    }),
  },
  {
    id: "garden-villa",
    name: "La villa des jardins",
    description:
      "Une demeure à deux ailes, une tour belvédère et un jardin symétrique, avec des toitures distinctes et des bancs sous les arbres.",
    difficulty: "Expert",
    color: "#e5eee1",
    placements: layout((p) => {
      base(p, 30, 24);
      building(p, 3, 3, 8, 12, 2, "ivory", "blue", "coral", { entrance: true });
      building(p, 19, 3, 8, 12, 2, "ivory", "blue", "coral", {
        entrance: true,
      });
      building(p, 11, 3, 8, 8, 3, "yellow", "blue", "coral", {
        entrance: true,
      });
      for (const x of [5, 21]) tree(p, x, 16);
      bench(p, 10, 18);
      bench(p, 16, 18);
      for (const x of [13, 15]) {
        p("tile-2x4", "ivory", x, 11, 2);
        p("tile-2x2", "ivory", x, 15, 2);
      }
    }),
  },
  {
    id: "discovery-museum",
    name: "Le musée des découvertes",
    description:
      "Un musée à trois pavillons, de hautes façades vitrées et une colonnade d’entrée, avec deux sculptures géométriques sur le parvis.",
    difficulty: "Expert",
    color: "#e2e8ef",
    placements: layout((p) => {
      base(p, 36, 24, "ivory");
      building(p, 3, 3, 8, 12, 2, "ivory", "blue", "charcoal", {
        terrace: true,
        entrance: true,
      });
      building(p, 12, 3, 12, 12, 2, "yellow", "blue", "charcoal", {
        entrance: true,
      });
      building(p, 25, 3, 8, 12, 2, "ivory", "blue", "charcoal", {
        terrace: true,
        entrance: true,
      });
      for (const x of [6, 12, 18, 24]) {
        for (const dx of [0, 5])
          for (const z of [2, 5, 8]) p("brick-1x2", "ivory", x + dx, 16, z);
        p("arch-1x6", "ivory", x, 16, 11, 90);
        p("plate-2x6", "charcoal", x, 16, 17, 90);
      }
      for (const x of [5, 27]) {
        p("brick-2x2", "charcoal", x, 19, 2);
        p("round-2x2", "violet", x, 19, 5);
        p("round-1x1", "yellow", x, 19, 8);
      }
    }),
  },
  {
    id: "season-gate",
    name: "La porte des saisons",
    description:
      "Deux tours encadrent un passage voûté, une galerie relie leurs étages et quatre fleurons colorés couronnent les créneaux.",
    difficulty: "Expert",
    color: "#e7e1ef",
    placements: layout((p) => {
      base(p, 30, 18, "charcoal");
      building(p, 3, 3, 8, 12, 3, "ivory", "violet", "brown", {
        terrace: true,
        entrance: true,
      });
      building(p, 19, 3, 8, 12, 3, "ivory", "violet", "brown", {
        terrace: true,
        entrance: true,
      });
      for (const y of [3, 8, 13]) {
        for (const x of [12, 17])
          for (const z of [2, 5, 8, 11]) p("brick-1x1", "ivory", x, y, z);
        p("arch-1x6", "ivory", 12, y, 14, 90);
      }
      floor(p, 11, 3, 20, 8, 12, "brown");
      for (const z of [21, 24, 27, 30]) perimeter(p, 11, 3, z, 8, 12, "yellow");
      floor(p, 11, 3, 33, 8, 12, "brown");
      roof(p, 11, 3, 34, 8, 12, "brown");
      for (const x of [3, 9, 19, 25])
        p("round-1x1", x < 15 ? "coral" : "blue", x, 3, 47);
    }),
  },
  {
    id: "four-seasons-theatre",
    name: "Le théâtre des quatre saisons",
    description:
      "Un théâtre à trois corps, avec une entrée monumentale à quatre colonnes sous un fronton, deux galeries latérales et cinq étages au centre.",
    difficulty: "Expert",
    color: "#f2e0d9",
    placements: layout((p) => {
      base(p, 36, 24, "ivory");
      building(p, 3, 3, 8, 12, 4, "coral", "violet", "charcoal", {
        entrance: true,
      });
      building(p, 12, 3, 12, 12, 5, "ivory", "violet", "charcoal", {
        entrance: true,
      });
      building(p, 25, 3, 8, 12, 4, "coral", "violet", "charcoal", {
        entrance: true,
      });
      // The tall, pedimented central entrance distinguishes the theatre from
      // an apartment block. Its four 2 × 2 columns support both arch ends.
      for (const x of [14, 20])
        for (const y of [15, 20])
          for (const z of [2, 5, 8, 11, 14, 17])
            p("brick-2x2", "ivory", x, y, z);
      for (const y of [15, 21]) p("arch-1x6", "ivory", 15, y, 20, 90);
      floor(p, 12, 15, 26, 12, 8, "ivory");
      roof(p, 12, 15, 27, 12, 8, "charcoal");
      for (const x of [3, 27]) {
        for (const dx of [0, 5])
          for (const z of [2, 5, 8, 11]) p("brick-1x2", "ivory", x + dx, 18, z);
        p("arch-1x6", "ivory", x, 18, 14, 90);
        p("plate-2x6", "charcoal", x, 18, 20, 90);
        p("slope-2x3", "charcoal", x, 18, 21, 270);
        p("slope-2x3", "charcoal", x + 3, 18, 21, 90);
      }
      bench(p, 5, 21, 1);
      bench(p, 26, 21, 1);
    }),
  },
  {
    id: "cape-fort",
    name: "Le fort du cap",
    description:
      "Quatre tours de guet à quatre niveaux entourent une cour protégée, reliées par des remparts crénelés et une porte centrale voûtée.",
    difficulty: "Expert",
    color: "#dfe5dc",
    placements: layout((p) => {
      base(p, 30, 30, "green");
      for (const x of [3, 19])
        for (const y of [3, 19])
          building(p, x, y, 8, 8, 4, "ivory", "charcoal", "charcoal", {
            terrace: true,
            arched: true,
          });
      for (const y of [3, 26]) {
        for (const z of [2, 5, 8, 11, 14, 17]) {
          if (y === 26 && z < 8) {
            line(p, 11, y, z, 2, "ivory", true);
            line(p, 17, y, z, 2, "ivory", true);
          } else if (y === 26 && z < 14) {
            line(p, 11, y, z, 1, "ivory", true);
            line(p, 18, y, z, 1, "ivory", true);
          } else line(p, 11, y, z, 8, "ivory", true);
        }
        if (y === 26) p("arch-1x6", "ivory", 12, y, 8, 90);
        for (const x of [11, 15, 18]) p("brick-1x1", "ivory", x, y, 20);
      }
      for (const x of [3, 26]) {
        for (const z of [2, 5, 8, 11, 14, 17]) line(p, x, 11, z, 8, "ivory");
        for (const y of [11, 15, 18]) p("brick-1x1", "ivory", x, y, 20);
      }
      for (const y of [11, 15, 19]) p("tile-2x4", "charcoal", 14, y, 2);
      for (const x of [11, 17]) tree(p, x, 12);
      bench(p, 10, 17);
    }),
  },
];
