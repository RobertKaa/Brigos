import type { ColorId } from "../catalog";
import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

type Add = Parameters<Parameters<typeof layout>[0]>[0];

/** All dimensions are stud footprints; every brick remains three plates high. */
function wallLine(
  p: Add,
  color: ColorId,
  x: number,
  y: number,
  z: number,
  length: number,
  alongX = false,
) {
  let offset = 0;
  for (const size of [8, 6, 4, 3, 2, 1]) {
    while (length - offset >= size) {
      p(
        `brick-1x${size}`,
        color,
        x + (alongX ? offset : 0),
        y + (alongX ? 0 : offset),
        z,
        alongX ? 90 : 0,
      );
      offset += size;
    }
  }
}

function squareFloor(
  p: Add,
  x: number,
  y: number,
  z: number,
  size: number,
  color: ColorId = "ivory",
) {
  const tile = size % 6 === 0 ? 6 : 4;
  for (let dx = 0; dx < size; dx += tile)
    for (let dy = 0; dy < size; dy += tile)
      p(`plate-${tile}x${tile}`, color, x + dx, y + dy, z);
}

/** Staggered base plates join every ground module into one attached construction. */
function landscapeBase(p: Add, width: number, depth: number, color: ColorId) {
  for (let x = 0; x < width; x += 6)
    for (let y = 0; y < depth; y += 6) p("plate-6x6", color, x, y, 0);
  for (let x = 3; x < width - 6; x += 6)
    for (let y = 3; y < depth - 6; y += 6) p("plate-6x6", color, x, y, 1);
}

function perimeter(
  p: Add,
  x: number,
  y: number,
  z: number,
  size: number,
  color: ColorId,
) {
  for (const dy of [0, size - 1]) wallLine(p, color, x, y + dy, z, size, true);
  for (const dx of [0, size - 1])
    wallLine(p, color, x + dx, y + 1, z, size - 2);
}

function windowFloor(
  p: Add,
  x: number,
  y: number,
  z: number,
  size: number,
  wall: ColorId,
  glass: ColorId,
  entrance = false,
  arched = false,
) {
  // Two-stud pilasters use real 1 × 2 bricks instead of fragmenting a facade
  // into a dense grid of single-stud columns between every window.
  const bayWidth = arched ? 6 : 4;
  const bays = Array.from(
    { length: Math.ceil(size / bayWidth) },
    (_, i) => i * bayWidth,
  );
  const windows = bays.filter((dx) => dx + 2 < size).map((dx) => dx + 2);
  const pillars = bays.map((dx) => [dx, Math.min(2, size - dx)]);
  for (const dy of [0, size - 1]) {
    if (entrance && dy === size - 1) {
      // A six-stud arch rises on solid cheeks; the upper floor lands on its lintel.
      const side = (size - 6) / 2;
      for (const dz of [0, 3]) {
        wallLine(p, wall, x, y + dy, z + dz, side + 1, true);
        wallLine(p, wall, x + size - side - 1, y + dy, z + dz, side + 1, true);
      }
      for (const dz of [6, 9]) {
        wallLine(p, wall, x, y + dy, z + dz, side, true);
        wallLine(p, wall, x + size - side, y + dy, z + dz, side, true);
      }
      p("arch-1x6", wall, x + side, y + dy, z + 6, 90);
    } else {
      wallLine(p, wall, x, y + dy, z, size, true);
      for (const dx of windows)
        p(
          arched ? "arch-1x4" : "special-window",
          arched ? wall : glass,
          x + dx,
          y + dy,
          z + 3,
          90,
        );
      for (const dz of [3, 6])
        for (const [dx, length] of pillars)
          wallLine(p, wall, x + dx, y + dy, z + dz, length, true);
      wallLine(p, wall, x, y + dy, z + 9, size, true);
    }
  }
  for (const dx of [0, size - 1]) {
    for (const dz of [0, 9]) wallLine(p, wall, x + dx, y + 1, z + dz, size - 2);
    const sidePillars = arched
      ? [1, size - 3]
      : Array.from({ length: Math.ceil((size - 2) / 4) }, (_, i) => 1 + i * 4);
    for (const dz of [3, 6])
      for (const dy of sidePillars)
        wallLine(p, wall, x + dx, y + dy, z + dz, 2);
    if (arched) {
      for (let dy = 3; dy < size - 3; dy += 6)
        p("arch-1x6", wall, x + dx, y + dy, z + 3);
    } else {
      for (let dy = 3; dy < size - 3; dy += 4)
        p("special-window", glass, x + dx, y + dy, z + 3);
    }
  }
}

function mansard(
  p: Add,
  x: number,
  y: number,
  z: number,
  size: 8 | 12,
  color: ColorId,
  lantern = false,
) {
  for (let inset = 0; size - inset * 2 >= 4; inset += 2, z += 4) {
    const width = size - inset * 2;
    for (let dy = 0; dy < size; dy += 4) {
      if (lantern && size === 12 && width === 4 && dy === 4) continue;
      p("slope-2x4", color, x + inset, y + dy, z, 180);
      p("slope-2x4", color, x + size - inset - 2, y + dy, z);
    }
    if (width === 4) break;
    for (let dx = inset + 2; dx < size - inset - 2; dx += 4)
      for (let dy = 0; dy < size; dy += 4)
        p("brick-4x4", color, x + dx, y + dy, z);
    const plateDepth = size === 12 ? 6 : 4;
    for (let dx = inset + 2; dx < size - inset - 2; dx += 4)
      for (let dy = 0; dy < size; dy += plateDepth)
        p(`plate-4x${plateDepth}`, color, x + dx, y + dy, z + 3);
  }
  if (lantern && size === 12) {
    // A studded ridge platform carries the lantern; smooth roof slopes never
    // serve as an imaginary attachment point for the ornament above them.
    p("brick-4x4", color, x + 4, y + 4, z);
    p("plate-4x4", "yellow", x + 4, y + 4, z + 3);
    for (const dy of [4, 7]) p("arch-1x4", "ivory", x + 4, y + dy, z + 4, 90);
    for (const dx of [4, 7])
      for (const dz of [4, 7]) p("brick-1x2", "ivory", x + dx, y + 5, z + dz);
    for (const dz of [4, 7]) p("round-2x2", "yellow", x + 5, y + 5, z + dz);
    p("plate-4x4", color, x + 4, y + 4, z + 10);
    p("slope-2x4", color, x + 4, y + 4, z + 11, 180);
    p("slope-2x4", color, x + 6, y + 4, z + 11);
  }
}

function battlements(
  p: Add,
  x: number,
  y: number,
  z: number,
  size: number,
  color: ColorId,
  gold = false,
) {
  // The parapet is continuous; merlons rise one brick above its walkway edge.
  perimeter(p, x, y, z, size, color);
  for (const dx of [0, size - 2])
    for (const dy of [0, size - 2]) {
      p("brick-2x2", color, x + dx, y + dy, z + 3);
      if (gold) p("round-2x2", "yellow", x + dx, y + dy, z + 6);
    }
  for (let offset = 4; offset < size - 2; offset += 4) {
    for (const dy of [0, size - 1])
      p("brick-1x2", color, x + offset, y + dy, z + 3, 90);
    for (const dx of [0, size - 1])
      p("brick-1x2", color, x + dx, y + offset, z + 3);
  }
}

function building(
  p: Add,
  options: {
    x: number;
    y: number;
    size: 8 | 12 | 18;
    floors: number;
    wall: ColorId;
    glass: ColorId;
    roof: ColorId;
    fortified?: boolean;
    entrance?: boolean;
    gold?: boolean;
    cornice?: ColorId;
    lantern?: boolean;
  },
) {
  const { x, y, size, floors, wall, glass, roof, fortified, entrance, gold } =
    options;
  for (const z of [2, 5]) perimeter(p, x, y, z, size, wall);
  if (size === 18)
    for (const z of [2, 5]) p("brick-4x4", wall, x + 7, y + 7, z);
  for (let floor = 0; floor < floors; floor++) {
    squareFloor(p, x, y, 8 + floor * 13, size, options.cornice);
    windowFloor(
      p,
      x,
      y,
      9 + floor * 13,
      size,
      wall,
      glass,
      entrance && floor === 0,
      fortified,
    );
    if (size === 18)
      for (const dz of [0, 3, 6, 9])
        p("brick-4x4", wall, x + 7, y + 7, 9 + floor * 13 + dz);
  }
  const roofZ = 8 + floors * 13;
  squareFloor(p, x, y, roofZ, size, roof);
  if (fortified) battlements(p, x, y, roofZ + 1, size, wall, gold);
  else mansard(p, x, y, roofZ + 1, size as 8 | 12, roof, options.lantern);
}

function stairs(p: Add, x: number, y: number) {
  for (let dx = 0; dx < 6; dx += 2) {
    p("brick-2x6", "ivory", x + dx, y, 2);
    p("brick-2x4", "ivory", x + dx, y, 5);
    p("tile-2x2", "charcoal", x + dx, y + 4, 5);
    p("tile-2x2", "charcoal", x + dx, y + 2, 8);
  }
  p("plate-2x6", "ivory", x, y, 8, 90);
}

function planter(p: Add, x: number, y: number) {
  p("plate-6x6", "green", x, y, 2);
  for (const dy of [0, 5]) wallLine(p, "brown", x, y + dy, 3, 6, true);
  for (const dx of [0, 5]) wallLine(p, "brown", x + dx, y + 1, 3, 4);
  p("plate-4x4", "brown", x + 1, y + 1, 3);
  for (const z of [4, 7]) p("round-2x2", "brown", x + 2, y + 2, z);
  p("round-4x4", "green", x + 1, y + 1, 10);
  p("round-2x2", "green", x + 2, y + 2, 13);
  p("round-1x1", "coral", x + 2, y + 2, 16);
}

function bench(p: Add, x: number, y: number) {
  for (const dx of [0, 3]) p("brick-1x2", "brown", x + dx, y, 2);
  p("plate-2x4", "brown", x, y, 5, 90);
  for (const dx of [0, 3]) p("brick-1x1", "brown", x + dx, y, 6);
  p("brick-1x4", "green", x, y, 9, 90);
  p("tile-1x4", "brown", x, y + 1, 6, 90);
}

function balcony(p: Add, x: number, y: number) {
  for (const dx of [0, 7]) p("plate-1x2", "ivory", x + dx, y, 2);
  for (const dx of [0, 7])
    for (const z of [3, 6, 9, 12]) p("brick-1x2", "coral", x + dx, y, z);
  p("plate-2x8", "ivory", x, y, 15, 90);
  for (const dx of [0, 7]) p("brick-1x2", "yellow", x + dx, y, 16);
  p("brick-1x6", "yellow", x + 1, y + 1, 16, 90);
  p("tile-1x4", "yellow", x + 1, y + 1, 19, 90);
  p("tile-1x2", "yellow", x + 5, y + 1, 19, 90);
}

function curtainWall(p: Add, x: number, y: number, horizontal: boolean) {
  const add: Add = (model, color, dx, dy, z, rotation = 0) => {
    p(
      model,
      color,
      x + (horizontal ? dx : dy),
      y + (horizontal ? dy : dx),
      z,
      horizontal ? rotation : rotation === 90 ? 0 : 90,
    );
  };
  for (const dx of [0, 6]) add("plate-2x6", "ivory", dx, 0, 2, 90);
  for (const z of [3, 6, 9, 12, 15, 18])
    for (const dx of [0, 6])
      add("brick-2x6", z < 9 ? "brown" : "ivory", dx, 0, z, 90);
  for (const dx of [0, 4, 8]) add("arch-2x4", "ivory", dx, 0, 21, 90);
  for (const dx of [0, 6]) add("plate-2x6", "ivory", dx, 0, 27, 90);
  for (const dx of [0, 4, 8]) add("brick-1x2", "ivory", dx, 1, 28, 90);
  for (const dx of [0, 6]) add("brick-1x6", "ivory", dx, 0, 28, 90);
}

export const LEGENDARY_ARCHITECTURE_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "aurora-palace",
    name: "Le palais des aurores",
    description:
      "Neuf pavillons entourent une cour ouverte : corniches dorées, ailes mansardées, deux lanternons, pavillon central surélevé, balcon et jardin d’apparat. Un palais à bâtir étage après étage.",
    difficulty: "Légendaire",
    color: "#eee2f3",
    placements: layout((p) => {
      landscapeBase(p, 72, 48, "green");
      for (const x of [6, 18, 30, 42, 54])
        building(p, {
          x,
          y: 6,
          size: 12,
          floors: x === 30 ? 5 : 3,
          wall: "ivory",
          glass: "blue",
          roof: "violet",
          entrance: x === 30,
          cornice: "yellow",
          lantern: x === 18 || x === 42,
        });
      for (const x of [6, 54])
        for (const y of [18, 30])
          building(p, {
            x,
            y,
            size: 12,
            floors: y === 30 ? 2 : 3,
            wall: "ivory",
            glass: "blue",
            roof: "violet",
            cornice: "yellow",
          });
      stairs(p, 33, 18);
      balcony(p, 32, 18);
      for (const x of [22, 44]) for (const y of [24, 36]) planter(p, x, y);
      for (const x of [18, 50]) for (const y of [24, 36]) bench(p, x, y);
      for (const x of [30, 40])
        for (const y of [26, 30, 34, 38]) p("tile-2x4", "charcoal", x, y, 2);
    }),
  },
  {
    id: "high-citadel",
    name: "La citadelle des huit tours",
    description:
      "Huit tours aux baies arquées gardent une enceinte à galeries, six maisons et un donjon de six étages. Parapets crénelés, escaliers et jardins composent ce quartier fortifié à grande entrée sous arche.",
    difficulty: "Légendaire",
    color: "#e6e4dc",
    placements: layout((p) => {
      landscapeBase(p, 96, 84, "green");
      for (const [x, y] of [
        [6, 6],
        [78, 6],
        [6, 66],
        [78, 66],
        [42, 6],
        [42, 66],
        [6, 30],
        [78, 30],
      ])
        building(p, {
          x,
          y,
          size: 12,
          floors: 4,
          wall: "ivory",
          glass: "charcoal",
          roof: "charcoal",
          fortified: true,
          gold: true,
          entrance: x === 42 && y === 66,
        });
      for (const y of [10, 70])
        for (const x of [18, 30, 54, 66]) curtainWall(p, x, y, true);
      for (const x of [10, 82])
        for (const y of [18, 42, 54]) curtainWall(p, x, y, false);
      building(p, {
        x: 39,
        y: 33,
        size: 18,
        floors: 6,
        wall: "ivory",
        glass: "blue",
        roof: "charcoal",
        fortified: true,
        entrance: true,
      });
      for (const x of [22, 66])
        for (const y of [22, 40, 56])
          building(p, {
            x,
            y,
            size: 8,
            floors: 2,
            wall: "brown",
            glass: "yellow",
            roof: y === 40 ? "blue" : "coral",
          });
      stairs(p, 45, 78);
      stairs(p, 45, 51);
      for (const x of [32, 58]) for (const y of [20, 56]) planter(p, x, y);
      for (const x of [18, 74]) for (const y of [24, 56]) bench(p, x, y);
      for (const x of [33, 59])
        for (const y of [30, 34, 38, 42, 46, 50])
          p("tile-2x4", "charcoal", x, y, 2);
    }),
  },
];
