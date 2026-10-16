import { Fragment, memo, useMemo } from "react";
import { createConstructionCache } from "./constructionCache";
import constructionPreviews from "./construction-previews.json";
import { ConstructionBackdrop } from "./ConstructionBackdrop";
import { BRIGO_BY_ID, CATALOG, COLORS, RECIPE_BY_ID } from "../game/catalog";
import type { Brigo } from "../game/catalog";
import { publicAssetUrl } from "../publicAssets";
import {
  footprintCells,
  rotateModelPoint,
  rotatedSize,
  prepareSceneOrder,
  studCenters,
} from "../game/geometry";
import type { Point3, Rotation } from "../game/geometry";

type Point = [number, number];
type Transform = (point: Point3) => Point3;
export interface Primitive {
  type: "path";
  surface: "body" | "detail" | "stud";
  studCenter?: Point3;
  d: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  depth: number;
  points: Point[];
  hatching?: string;
  brush?: string;
  highlight?: string;
}

const project = ({ x, y, z }: Point3): Point => [
  (x - y) * 25,
  (x + y) * 12.5 - z * 7,
];
const point = (x: number, y: number, z: number): Point3 => ({ x, y, z });
const MANGA_INK = "#252127";
const MANGA_HIGHLIGHT = "#fff5d9";
const path = (points: Point[], closed = true) =>
  points
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`,
    )
    .join(" ") + (closed ? "Z" : "");

// Hand-drawn shading is clipped geometrically instead of by SVG masks. A whole
// scene can therefore reuse its paths without hundreds of unique clip IDs.
function inkHatching(polygon: Point[]): string | undefined {
  const offsets = polygon.map(([x, y]) => y - x * 0.65);
  const min = Math.min(...offsets),
    max = Math.max(...offsets);
  if (max - min < 4) return;
  const lines: string[] = [];
  for (const fraction of [0.16, 0.29, 0.43, 0.58, 0.74, 0.87]) {
    const offset = min + (max - min) * fraction;
    const intersections: Point[] = [];
    polygon.forEach(([x, y], index) => {
      const [nx, ny] = polygon[(index + 1) % polygon.length];
      const a = y - x * 0.65 - offset;
      const b = ny - nx * 0.65 - offset;
      if (a >= 0 === b >= 0) return;
      const t = a / (a - b);
      intersections.push([x + (nx - x) * t, y + (ny - y) * t]);
    });
    intersections.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const a = intersections[i],
        b = intersections[i + 1];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 5) continue;
      const inset = Math.min(0.24, (1.6 + fraction * 2.1) / length);
      lines.push(
        path(
          [
            [a[0] + (b[0] - a[0]) * inset, a[1] + (b[1] - a[1]) * inset],
            [b[0] - (b[0] - a[0]) * inset, b[1] - (b[1] - a[1]) * inset],
          ],
          false,
        ),
      );
    }
  }
  return lines.join(" ") || undefined;
}

function insidePolygon(polygon: Point[], [x, y]: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Tapered brush marks stay inside a face, including concave top profiles. */
function faceInk(polygon: Point[], lit: boolean) {
  const edges = polygon
    .map((a, index) => {
      const b = polygon[(index + 1) % polygon.length];
      return { a, b, length: Math.hypot(b[0] - a[0], b[1] - a[1]) };
    })
    .filter(({ length }) => length > 9)
    .sort((a, b) => b.length - a.length);
  for (const { a, b, length } of edges) {
    const at = (t: number, inset: number, sign: number): Point => [
      a[0] + (b[0] - a[0]) * t - ((b[1] - a[1]) / length) * inset * sign,
      a[1] + (b[1] - a[1]) * t + ((b[0] - a[0]) / length) * inset * sign,
    ];
    for (const sign of [1, -1]) {
      const inset = lit ? 1.7 : 0.45;
      const start = at(0.15, inset, sign),
        end = at(0.83, inset, sign);
      const middle = at(0.57, lit ? inset : 1.55, sign);
      if ([start, end, middle].every((p) => insidePolygon(polygon, p)))
        return lit
          ? { highlight: path([start, end], false) }
          : { brush: path([start, end, middle]) };
    }
  }
  return {};
}

function bevelFootprint(footprint: Point[], amount = 0.18): Point[] {
  return footprint.flatMap(([x, y], index) => {
    const previous =
      footprint[(index + footprint.length - 1) % footprint.length];
    const next = footprint[(index + 1) % footprint.length];
    const toward = ([px, py]: Point): Point => {
      const length = Math.hypot(px - x, py - y);
      const inset = Math.min(amount, length / 3);
      return [x + ((px - x) * inset) / length, y + ((py - y) * inset) / length];
    };
    return [toward(previous), toward(next)];
  });
}

function shade(hex: string, change: number): string {
  return (
    "#" +
    [1, 3, 5]
      .map((index) =>
        Math.max(
          0,
          Math.min(255, parseInt(hex.slice(index, index + 2), 16) + change),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function normal(vertices: Point3[]): Point3 {
  const a = vertices[0],
    b = vertices[1],
    c = vertices[2];
  const u = point(b.x - a.x, b.y - a.y, b.z - a.z);
  const v = point(c.x - a.x, c.y - a.y, c.z - a.z);
  return point(
    u.y * v.z - u.z * v.y,
    u.z * v.x - u.x * v.z,
    u.x * v.y - u.y * v.x,
  );
}

function geometry(
  brigo: Brigo,
  transform: Transform,
  showStud: (center: Point3) => boolean = () => true,
): Primitive[] {
  const { width: w, depth: d, height: h, shape } = brigo.model;
  const color = brigo.color.hex;
  const outline = MANGA_INK;
  const primitives: Primitive[] = [];
  const details: Primitive[] = [];
  const foreground: Primitive[] = [];
  let currentStud: Point3 | undefined;
  let drawingDetail = false;
  let compoundOrdered = false;
  const add = (
    vertices: Point3[],
    fill: string,
    stroke: string | undefined = outline,
    opacity?: number,
    closed = true,
  ) => {
    const transformed = vertices.map(transform);
    const points = transformed.map(project);
    const n =
      closed && vertices.length > 2 ? normal(transformed) : point(0, 0, 0);
    const faceArea =
      Math.abs(
        points.reduce((area, [x, y], index) => {
          const next = points[(index + 1) % points.length];
          return area + x * next[1] - next[0] * y;
        }, 0),
      ) / 2;
    const inkedSurface =
      closed && !drawingDetail && fill !== "none" && faceArea > 24;
    const lit = n.z > 0.00001;
    (drawingDetail ? details : primitives).push({
      type: "path",
      surface: currentStud ? "stud" : drawingDetail ? "detail" : "body",
      studCenter: currentStud ? transform(currentStud) : undefined,
      d: path(points, closed),
      fill,
      stroke,
      strokeWidth: currentStud
        ? 0.9
        : faceArea < 24
          ? 0.7
          : drawingDetail
            ? 0.9
            : 1.55,
      opacity,
      points,
      hatching:
        !currentStud &&
        !drawingDetail &&
        closed &&
        Math.abs(n.z) < 0.00001 &&
        faceArea > 45
          ? inkHatching(points)
          : undefined,
      ...(inkedSurface ? faceInk(points, lit) : {}),
      depth:
        transformed.reduce((sum, p) => sum + p.x + p.y + p.z * 0.72, 0) /
        transformed.length,
    });
  };
  const face = (
    vertices: Point3[],
    fill?: string,
    stroke: string | undefined = outline,
    opacity?: number,
  ) => {
    const n = normal(vertices.map(transform));
    if (n.x + n.y + n.z * (25 / 7) <= 0.00001) return;
    const lighting = n.z > 0 ? 21 : n.x > n.y ? -48 : -17;
    add(vertices, fill ?? shade(color, lighting), stroke, opacity);
  };
  const extrude = (
    footprint: Point[],
    base: number,
    height: number,
    fill?: string,
    beveled = true,
  ) => {
    if (beveled) footprint = bevelFootprint(footprint);
    footprint.forEach(([x, y], index) => {
      const [nx, ny] = footprint[(index + 1) % footprint.length];
      face(
        [
          point(x, y, base),
          point(nx, ny, base),
          point(nx, ny, base + height),
          point(x, y, base + height),
        ],
        fill,
      );
    });
    face(
      footprint.map(([x, y]) => point(x, y, base + height)),
      fill,
    );
  };
  const block = (
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    fill?: string,
    beveled = true,
  ) =>
    extrude(
      [
        [x, y],
        [x + width, y],
        [x + width, y + depth],
        [x, y + depth],
      ],
      z,
      height,
      fill,
      beveled,
    );
  // Adjacent solid components have an unambiguous order along their mechanism
  // axis. A single average-depth sort can otherwise paint a recessed metal face
  // over a nearer collar or wing. Keep each convex component's own face order.
  const compound = (draws: (() => void)[], axis: "x" | "y") => {
    const groups = draws.map((draw) => {
      const start = primitives.length;
      draw();
      return primitives.splice(start).sort((a, b) => a.depth - b.depth);
    });
    const origin = transform(point(0, 0, 0));
    const direction = transform(
      point(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, 0),
    );
    if (direction.x + direction.y < origin.x + origin.y) groups.reverse();
    primitives.push(...groups.flat());
    compoundOrdered = true;
  };
  const cylinder = (
    ring: Point[],
    z: number,
    height: number,
    sideColor: string,
    topColor: string,
  ) => {
    const visible = ring.map(([x, y], index) => {
      const [nx, ny] = ring[(index + 1) % ring.length];
      const n = normal(
        [point(x, y, z), point(nx, ny, z), point(nx, ny, z + height)].map(
          transform,
        ),
      );
      return n.x + n.y > 0.00001;
    });
    const start = visible.findIndex(
      (value, index) =>
        value && !visible[(index + visible.length - 1) % visible.length],
    );
    if (start >= 0) {
      const arc: Point[] = [ring[start]];
      for (
        let i = 0;
        i < ring.length && visible[(start + i) % ring.length];
        i++
      )
        arc.push(ring[(start + i + 1) % ring.length]);
      add(
        [
          ...arc.map(([x, y]) => point(x, y, z)),
          ...[...arc].reverse().map(([x, y]) => point(x, y, z + height)),
        ],
        sideColor,
      );
    }
    face(
      ring.map(([x, y]) => point(x, y, z + height)),
      topColor,
    );
  };
  const stud = (x: number, y: number, z: number) => {
    // Brigo's low diamond clasp is deliberately unlike a round cylindrical stud.
    const ring: Point[] = [
      [x, y - 0.27],
      [x + 0.27, y],
      [x, y + 0.27],
      [x - 0.27, y],
    ];
    cylinder(ring, z, 0.2, shade(color, -38), shade(color, 30));
    add(
      [point(x - 0.11, y, z + 0.21), point(x + 0.11, y, z + 0.21)],
      "none",
      outline,
      0.7,
      false,
    );
  };

  if (shape === "wheel") {
    const tireBack = 0.03;
    const tireFront = w - 0.03;
    const ring = Array.from({ length: 12 }, (_, index) => {
      const angle = (index * Math.PI * 2) / 12 + Math.PI / 12;
      return [
        d / 2 + Math.cos(angle) * d * 0.49,
        h / 2 + Math.sin(angle) * h * 0.49,
      ] as Point;
    });
    // A cut-stone tread and a diamond hub are Brigo mechanisms, with no molded
    // logos, copied rim patterns or familiar toy connector system.
    for (let index = 0; index < ring.length; index++) {
      const [y, z] = ring[index],
        [ny, nz] = ring[(index + 1) % ring.length];
      face(
        [
          point(tireBack, y, z),
          point(tireBack, ny, nz),
          point(tireFront, ny, nz),
          point(tireFront, y, z),
        ],
        index % 2 ? "#485164" : "#353e50",
      );
    }
    face(
      ring.map(([y, z]) => point(tireFront, y, z)),
      "#30384b",
    );
    face(
      [...ring].reverse().map(([y, z]) => point(tireBack, y, z)),
      "#30384b",
    );
    const axis = transform(point(w, 0, 0)),
      origin = transform(point(0, 0, 0));
    const positiveX = axis.x + axis.y > origin.x + origin.y;
    // The hub reaches the catalogue boundary; its inset rim and diamond sit
    // at the same physical depths as the 3D mechanism, ahead of the tire.
    const rimX = positiveX ? w - 0.004 : 0.004;
    const diamondX = positiveX ? w - 0.002 : 0.002;
    const hubX = positiveX ? w : 0;
    const rim = ring.map(([y, z]) =>
      point(rimX, d / 2 + (y - d / 2) * 0.66, h / 2 + (z - h / 2) * 0.66),
    );
    drawingDetail = true;
    add(rim, shade(color, 13));
    add(
      [
        point(diamondX, d / 2, h * 0.26),
        point(diamondX, d * 0.72, h / 2),
        point(diamondX, d / 2, h * 0.74),
        point(diamondX, d * 0.28, h / 2),
      ],
      "#30384b",
    );
    add(
      [
        point(hubX, d / 2, h * 0.41),
        point(hubX, d * 0.59, h / 2),
        point(hubX, d / 2, h * 0.59),
        point(hubX, d * 0.41, h / 2),
      ],
      shade(color, 39),
    );
    drawingDetail = false;
  } else if (shape === "axle") {
    // Only exposed shaft intervals are drawn; its former end faces were inside
    // the solid collars. Tiny metal corners outside the center collar's bevel
    // remain in the exposed profile, rather than leaving holes at the junction.
    const braceLeft = w / 2 - 0.28;
    const lower = d * 0.28;
    const upper = d * 0.72;
    const corner = Math.max(0, 0.18 - d * 0.16);
    const leftShaft: Point[] = [
      [0.5, lower],
      [braceLeft + corner, lower],
      [braceLeft, lower + corner],
      [braceLeft, upper - corner],
      [braceLeft + corner, upper],
      [0.5, upper],
    ];
    const rightShaft: Point[] = [...leftShaft]
      .reverse()
      .map(([x, y]) => [w - x, y]);
    compound(
      [
        () => block(0, 0, 0, 0.5, d, h),
        () => extrude(leftShaft, h * 0.2, h * 0.6, "#647187", false),
        () =>
          block(w / 2 - 0.28, d * 0.12, 0, 0.56, d * 0.76, h, shade(color, 17)),
        () => extrude(rightShaft, h * 0.2, h * 0.6, "#647187", false),
        () => block(w - 0.5, 0, 0, 0.5, d, h),
      ],
      "x",
    );
  } else if (shape === "bearing") {
    // A real square tunnel crosses the X axis. Its four inner walls and the
    // chamfered outer ring leave the shaft clear; no painted dark fake hole.
    const outer: Point[] = [
      [0, 0.18],
      [0.18, 0],
      [d - 0.18, 0],
      [d, 0.18],
      [d, h - 0.18],
      [d - 0.18, h],
      [0.18, h],
      [0, h - 0.18],
    ];
    const inner: Point[] = [
      [0.5, 0.5],
      [0.5, 0.5],
      [d - 0.5, 0.5],
      [d - 0.5, 0.5],
      [d - 0.5, h - 0.5],
      [d - 0.5, h - 0.5],
      [0.5, h - 0.5],
      [0.5, h - 0.5],
    ];
    outer.forEach(([y, z], index) => {
      const next = (index + 1) % outer.length;
      const [ny, nz] = outer[next];
      face([
        point(0, y, z),
        point(0, ny, nz),
        point(w, ny, nz),
        point(w, y, z),
      ]);
      const [iy, iz] = inner[index],
        [iny, inz] = inner[next];
      if (iy !== iny || iz !== inz)
        face([
          point(w, iy, iz),
          point(w, iny, inz),
          point(0, iny, inz),
          point(0, iy, iz),
        ]);
      // The near rim covers the ends of the inner walls in every rotation.
      const cap = (x: number, reverse: boolean) => {
        const vertices = [
          point(x, y, z),
          point(x, ny, nz),
          point(x, iny, inz),
          point(x, iy, iz),
        ];
        if (iy === iny && iz === inz) vertices.pop();
        const start = primitives.length;
        face(reverse ? vertices.reverse() : vertices);
        foreground.push(...primitives.splice(start));
      };
      cap(0, true);
      cap(w, false);
    });
  } else if (shape === "hinge") {
    compound(
      [
        () => block(0, 0, 0, w, d * 0.44, h),
        () =>
          block(
            w * 0.28,
            d * 0.44,
            h * 0.17,
            w * 0.44,
            d * 0.12,
            h * 0.66,
            "#647187",
            false,
          ),
        () => block(0, d * 0.56, 0, w, d * 0.44, h),
      ],
      "y",
    );
  } else if (shape === "cone") {
    const topRadius = w > 2 ? 1 : 0;
    const ring = Array.from({ length: 10 }, (_, index) => {
      const angle = (index * Math.PI * 2) / 10;
      return {
        bottom: point(
          w / 2 + (Math.cos(angle) * w) / 2,
          d / 2 + (Math.sin(angle) * d) / 2,
          0,
        ),
        top: point(
          w / 2 + Math.cos(angle) * topRadius,
          d / 2 + Math.sin(angle) * topRadius,
          h,
        ),
      };
    });
    ring.forEach((vertex, index) => {
      const next = ring[(index + 1) % ring.length];
      const vertices = topRadius
        ? [vertex.bottom, next.bottom, next.top, vertex.top]
        : [vertex.bottom, next.bottom, vertex.top];
      const n = normal(vertices.map(transform));
      const length = Math.hypot(n.x, n.y, n.z);
      const lighting = Math.round((-22 * n.x - 8 * n.y + 15 * n.z) / length);
      // Matching edges overlap the rasterizer's antialias seams between facets.
      const fill = shade(color, lighting);
      face(vertices, fill, fill);
    });
    if (topRadius)
      face(
        ring.map((vertex) => vertex.top),
        shade(color, 13),
      );
  } else if (shape === "round") {
    const ring = Array.from({ length: 12 }, (_, index): Point => {
      const angle = (index * Math.PI * 2) / 12;
      return [
        w / 2 + (Math.cos(angle) * w) / 2,
        d / 2 + (Math.sin(angle) * d) / 2,
      ];
    });
    cylinder(ring, 0, h, shade(color, -37), shade(color, 21));
  } else if (shape === "slope") {
    const high = h,
      low = 0.6;
    const footprint = bevelFootprint([
      [0, 0],
      [w, 0],
      [w, d],
      [0, d],
    ]);
    const bottom = footprint.map(([x, y]) => point(x, y, 0));
    const top = footprint.map(([x, y]) =>
      point(x, y, high + ((low - high) * x) / w),
    );
    bottom.forEach((vertex, index) => {
      const next = (index + 1) % bottom.length;
      face([vertex, bottom[next], top[next], top[index]]);
    });
    face(top, shade(color, 18));
  } else if (shape === "arch" || shape === "window" || shape === "door") {
    const pillar = Math.min(0.58, d / 4);
    const cap = shape === "door" ? 0.85 : 1;
    const profile: Point[] = [
      [0, 0],
      [pillar, 0],
    ];
    if (shape === "arch") {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        profile.push([
          pillar + (d - pillar * 2) * t,
          h - cap - Math.pow((t - 0.5) * 2, 2) * Math.min(1.75, h / 3),
        ]);
      }
    } else {
      profile.push([pillar, h - cap], [d - pillar, h - cap]);
    }
    profile.push([d - pillar, 0], [d, 0], [d, h], [0, h]);
    // Keep the door's near U-shaped frame above its recessed leaf and relief.
    // Its average depth cannot express this overlap: the tall frame and lower
    // leaf have different centroids even though the frame is physically nearer.
    const frameFace = (vertices: Point3[]) => {
      const start = primitives.length;
      face(vertices);
      if (shape === "door") foreground.push(...primitives.splice(start));
    };
    // The opening is cut through the full thickness, rather than painted on a block.
    frameFace(profile.map(([y, z]) => point(w, y, z)));
    frameFace([...profile].reverse().map(([y, z]) => point(0, y, z)));
    profile.forEach(([y, z], index) => {
      const [ny, nz] = profile[(index + 1) % profile.length];
      face([
        point(0, y, z),
        point(0, ny, nz),
        point(w, ny, nz),
        point(w, y, z),
      ]);
    });
    if (shape === "window") {
      block(0, 0, 0, w, d, 0.55);
      const glass = [
        point(w / 2, pillar, 0.55),
        point(w / 2, d - pillar, 0.55),
        point(w / 2, d - pillar, h - cap),
        point(w / 2, pillar, h - cap),
      ];
      add(glass, "#83b8c8", "#5b91a7", 0.38);
      block(w / 2 - 0.08, d / 2 - 0.075, 0.55, 0.16, 0.15, h - cap - 0.55);
      block(w / 2 - 0.08, pillar, h / 2 - 0.1, 0.16, d - pillar * 2, 0.2);
    } else if (shape === "door") {
      block(
        w / 2 - 0.09,
        pillar,
        0.1,
        0.18,
        d - pillar * 2,
        h - cap - 0.1,
        shade(color, -8),
      );
      const frontX =
        transform(point(1, 0, 0)).x + transform(point(1, 0, 0)).y >
        transform(point(0, 0, 0)).x + transform(point(0, 0, 0)).y
          ? w / 2 + 0.1
          : w / 2 - 0.1;
      // These shallow decorations lie on the same front panel. Sorting them by
      // their average height lets the larger panel paint over its lower details.
      drawingDetail = true;
      for (const [bottom, top] of [
        [0.7, h * 0.42],
        [h * 0.51, h - 1.5],
      ])
        add(
          [
            point(frontX, pillar + 0.25, bottom),
            point(frontX, d - pillar - 0.25, bottom),
            point(frontX, d - pillar - 0.25, top),
            point(frontX, pillar + 0.25, top),
          ],
          shade(color, -14),
          outline,
        );
      add(
        Array.from({ length: 16 }, (_, i) => {
          const angle = (i * Math.PI) / 8;
          return point(
            frontX,
            d - pillar - 0.5 + Math.cos(angle) * 0.11,
            h * 0.46 + Math.sin(angle) * 0.38,
          );
        }),
        "#f5ca62",
        "#97702c",
      );
      drawingDetail = false;
    }
  } else if (shape === "corner") {
    extrude(
      [
        [0, 0],
        [w, 0],
        [w, 1],
        [1, 1],
        [1, d],
        [0, d],
      ],
      0,
      h,
    );
  } else if (shape === "cross") {
    const middleX = Math.floor(w / 2),
      middleY = Math.floor(d / 2);
    extrude(
      [
        [middleX, 0],
        [middleX + 1, 0],
        [middleX + 1, middleY],
        [w, middleY],
        [w, middleY + 1],
        [middleX + 1, middleY + 1],
        [middleX + 1, d],
        [middleX, d],
        [middleX, middleY + 1],
        [0, middleY + 1],
        [0, middleY],
        [middleX, middleY],
      ],
      0,
      h,
    );
  } else {
    block(0, 0, 0, w, d, h);
  }
  // Broad top faces must always stay behind every stud attached to them.
  if (!compoundOrdered) primitives.sort((a, b) => a.depth - b.depth);
  primitives.push(...details, ...foreground);
  const centers = studCenters(brigo.model).sort((a, b) => {
    const worldA = transform(point(a.x, a.y, h));
    const worldB = transform(point(b.x, b.y, h));
    return worldA.x + worldA.y - worldB.x - worldB.y;
  });
  for (const center of centers) {
    currentStud = point(center.x, center.y, h);
    if (showStud(currentStud)) stud(center.x, center.y, h);
  }
  return primitives;
}

function bounds(primitives: Primitive[], padding: number) {
  const extremes = primitives.reduce(
    (acc, primitive) => {
      for (const [x, y] of primitive.points) {
        acc.minX = Math.min(acc.minX, x);
        acc.maxX = Math.max(acc.maxX, x);
        acc.minY = Math.min(acc.minY, y);
        acc.maxY = Math.max(acc.maxY, y);
      }
      return acc;
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const minX = extremes.minX - padding;
  const minY = extremes.minY - padding;
  const width = extremes.maxX - minX + padding;
  const height = extremes.maxY - minY + padding;
  return {
    minX,
    minY,
    width,
    height,
    viewBox: `${minX} ${minY} ${width} ${height}`,
  };
}

export function brigoGeometry(brigo: Brigo, rotation: Rotation = 0) {
  const primitives = geometry(brigo, (p) =>
    rotateModelPoint(brigo.model, p, rotation),
  );
  return { primitives, ...bounds(primitives, 9) };
}

function InkDetails({ primitive }: { primitive: Primitive }) {
  return (
    <>
      {primitive.hatching && (
        <path
          className="brigo-hatching"
          d={primitive.hatching}
          fill="none"
          stroke={MANGA_INK}
          strokeWidth=".7"
          opacity=".43"
        />
      )}
      {primitive.brush && (
        <path
          className="brigo-brush"
          d={primitive.brush}
          fill={MANGA_INK}
          stroke="none"
          opacity=".85"
        />
      )}
      {primitive.highlight && (
        <path
          className="brigo-highlight"
          d={primitive.highlight}
          fill="none"
          stroke={MANGA_HIGHLIGHT}
          strokeWidth=".9"
          opacity=".82"
        />
      )}
    </>
  );
}

function Drawing({ primitives }: { primitives: Primitive[] }) {
  return (
    <>
      {primitives.map((primitive, index) => (
        <Fragment key={index}>
          <path
            d={primitive.d}
            fill={primitive.fill}
            stroke={primitive.stroke}
            strokeWidth={primitive.strokeWidth}
            opacity={primitive.opacity}
          />
          <InkDetails primitive={primitive} />
        </Fragment>
      ))}
    </>
  );
}

export function BrigoArt({
  brigo,
  className = "",
  muted = false,
  title,
  rotation = 0,
  ...position
}: {
  brigo: Brigo;
  className?: string;
  muted?: boolean;
  title?: string;
  rotation?: Rotation;
  x?: number;
  y?: number;
  width?: number | string;
  height?: number | string;
}) {
  const { primitives, viewBox } = brigoGeometry(brigo, rotation);
  return (
    <svg
      viewBox={viewBox}
      className={`brigo-art ${className} ${muted ? "muted" : ""}`}
      {...position}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-art-style="ink"
      data-art-finish="manga"
      data-connector-style="diamond"
    >
      <g strokeWidth="1.55" strokeLinejoin="round" strokeLinecap="round">
        <Drawing primitives={primitives} />
      </g>
    </svg>
  );
}

const previewColors = [
  "blue",
  "mint",
  "coral",
  "yellow",
  "violet",
  "orange",
  "ivory",
  "charcoal",
];
const meshes = createConstructionCache<{
  primitives: Primitive[];
  framing: ReturnType<typeof bounds>;
}>(128, 40_000);
const meshIdentities = new WeakMap<object, number>();
let nextMeshIdentity = 0;
function constructionMesh(
  brigo: Brigo,
  rotation: Rotation,
  detailedStuds: boolean,
) {
  if (!meshIdentities.has(brigo)) meshIdentities.set(brigo, ++nextMeshIdentity);
  const key = `${meshIdentities.get(brigo)}:${rotation}:${detailedStuds}`;
  const cached = meshes.get(key);
  if (cached) return cached;
  const primitives = geometry(
    brigo,
    (p) => rotateModelPoint(brigo.model, p, rotation),
    detailedStuds ? undefined : () => false,
  );
  return meshes.set(
    key,
    { primitives, framing: bounds(primitives, 0) },
    primitives.length,
  );
}
export function prepareConstructionScene({
  recipeId,
  pieces,
  rotation = 0,
  color,
}: {
  recipeId: string;
  pieces?: Record<string, number>;
  rotation?: Rotation;
  color?: string;
}) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe || recipe.placements.length === 0) return null;
  rotation = ((rotation + (recipe.previewRotation ?? 0)) % 360) as Rotation;
  // At a monument's scale studs are sub-pixel details. Keep every piece and its
  // exact shape, while leaving the tiny cap meshes out of the overall view.
  const detailedStuds = recipe.placements.length <= 180;
  const remaining = { ...pieces };
  const assignments: {
    placement: (typeof recipe.placements)[number];
    brigo: Brigo | undefined;
  }[] = [];
  // Exact colors get their references first, before an unconstrained placement.
  const allocationOrder = recipe.placements
    .map((placement, index) => ({ placement, index }))
    .sort(
      (a, b) => Number(!!b.placement.colorId) - Number(!!a.placement.colorId),
    );
  for (const { placement, index } of allocationOrder) {
    const actualId = Object.keys(remaining).find((id) => {
      const brigo = BRIGO_BY_ID.get(id);
      return (
        remaining[id] > 0 &&
        brigo?.model.id === placement.modelId &&
        (!placement.colorId || brigo.color.id === placement.colorId)
      );
    });
    if (actualId) remaining[actualId]--;
    const preferred = `${placement.modelId}:${placement.colorId ?? color ?? previewColors[index % previewColors.length]}`;
    const brigo =
      (actualId && BRIGO_BY_ID.get(actualId)) ||
      BRIGO_BY_ID.get(preferred) ||
      CATALOG.find((candidate) => candidate.model.id === placement.modelId);
    assignments[index] = { placement, brigo: brigo || undefined };
  }
  const resolved = assignments.filter(
    (assignment): assignment is typeof assignment & { brigo: Brigo } =>
      !!assignment.brigo,
  );
  if (resolved.length === 0) return null;
  const minX = Math.min(...resolved.map(({ placement }) => placement.x));
  const minY = Math.min(...resolved.map(({ placement }) => placement.y));
  const sceneSize = {
    width:
      Math.max(
        ...resolved.map(
          ({ placement, brigo }) =>
            placement.x + rotatedSize(brigo.model, placement.rotation).width,
        ),
      ) - minX,
    depth:
      Math.max(
        ...resolved.map(
          ({ placement, brigo }) =>
            placement.y + rotatedSize(brigo.model, placement.rotation).depth,
        ),
      ) - minY,
  };
  const layers = resolved.map(({ placement, brigo }) => {
    const transform = (p: Point3) => {
      const local = rotateModelPoint(brigo.model, p, placement.rotation);
      return rotateModelPoint(
        sceneSize,
        point(
          local.x + placement.x - minX,
          local.y + placement.y - minY,
          local.z + placement.z,
        ),
        rotation,
      );
    };
    const combinedRotation = ((placement.rotation + rotation) %
      360) as Rotation;
    const mesh = constructionMesh(brigo, combinedRotation, detailedStuds);
    const { primitives } = mesh;
    const origin = transform(point(0, 0, 0));
    const localOrigin = rotateModelPoint(
      brigo.model,
      point(0, 0, 0),
      combinedRotation,
    );
    const worldOffset = point(
      origin.x - localOrigin.x,
      origin.y - localOrigin.y,
      origin.z - localOrigin.z,
    );
    const offset = project(worldOffset);
    const corners = [0, brigo.model.width].flatMap((x) =>
      [0, brigo.model.depth].flatMap((y) =>
        [0, brigo.model.height].map((z) => transform(point(x, y, z))),
      ),
    );
    const worldBounds = {
      minX: Math.min(...corners.map((p) => p.x)),
      maxX: Math.max(...corners.map((p) => p.x)),
      minY: Math.min(...corners.map((p) => p.y)),
      maxY: Math.max(...corners.map((p) => p.y)),
      minZ: Math.min(...corners.map((p) => p.z)),
      maxZ: Math.max(...corners.map((p) => p.z)),
    };
    const projected = mesh.framing;
    return {
      placement,
      brigo,
      primitives,
      visibleStudCount: 0,
      transform,
      offset,
      worldOffset,
      worldBounds,
      projectedBounds: {
        minX: projected.minX + offset[0],
        maxX: projected.minX + projected.width + offset[0],
        minY: projected.minY + offset[1],
        maxY: projected.minY + projected.height + offset[1],
      },
    };
  });
  const frameX =
    Math.min(...layers.map((layer) => layer.projectedBounds.minX)) - 16;
  const frameY =
    Math.min(...layers.map((layer) => layer.projectedBounds.minY)) - 16;
  const frameWidth =
    Math.max(...layers.map((layer) => layer.projectedBounds.maxX)) +
    16 -
    frameX;
  const frameHeight =
    Math.max(...layers.map((layer) => layer.projectedBounds.maxY)) +
    16 -
    frameY;
  const framing = {
    minX: frameX,
    minY: frameY,
    width: frameWidth,
    height: frameHeight,
    viewBox: `${frameX} ${frameY} ${frameWidth} ${frameHeight}`,
  };
  const rotatedSceneSize = rotatedSize(sceneSize, rotation);
  const center = project(
    point(rotatedSceneSize.width / 2, rotatedSceneSize.depth / 2, 0),
  );
  const order = prepareSceneOrder(layers);
  const frames = createConstructionCache<{
    visibleCount: number;
    orderedLayers: typeof layers;
  }>(4, layers.length * 4);
  const socketKey = (x: number, y: number, z: number) =>
    `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
  const layerVariants = layers.map(
    () => new Map<string, (typeof layers)[number]>(),
  );
  return {
    layers,
    framing,
    center,
    sceneSize,
    frame(step?: number) {
      const visibleCount =
        step === undefined
          ? layers.length
          : Math.max(
              0,
              Math.min(
                layers.length,
                Number.isFinite(step) ? Math.floor(step) : 0,
              ),
            );
      const cached = frames.get(String(visibleCount));
      if (cached) return cached;
      const visibleLayers = layers.slice(0, visibleCount);
      const coveredStuds = new Set<string>();
      if (detailedStuds)
        for (const { placement, brigo } of visibleLayers) {
          for (const cell of footprintCells(brigo.model)) {
            const framed =
              brigo.model.shape === "arch" || brigo.model.shape === "door";
            if (framed && cell.y !== 0 && cell.y !== brigo.model.depth - 1)
              continue;
            const socket = rotateModelPoint(
              brigo.model,
              point(cell.x + 0.5, cell.y + 0.5, 0),
              placement.rotation,
            );
            const world = rotateModelPoint(
              sceneSize,
              point(
                socket.x + placement.x - minX,
                socket.y + placement.y - minY,
                placement.z,
              ),
              rotation,
            );
            coveredStuds.add(socketKey(world.x, world.y, world.z));
          }
        }
      const orderedLayers = order.sortVisible(visibleCount).map((layer) => {
        if (!detailedStuds) return layer;
        const visibleStuds = new Set<string>();
        const primitives = layer.primitives.filter((primitive) => {
          const center = primitive.studCenter;
          if (!center) return true;
          const key = socketKey(
            center.x + layer.worldOffset.x,
            center.y + layer.worldOffset.y,
            center.z + layer.worldOffset.z,
          );
          if (coveredStuds.has(key)) return false;
          visibleStuds.add(key);
          return true;
        });
        const signature = [...visibleStuds].join(";");
        const variants = layerVariants[layers.indexOf(layer)];
        const existing = variants.get(signature);
        if (existing) return existing;
        const variant = {
          ...layer,
          primitives,
          visibleStudCount: visibleStuds.size,
        };
        // Keep just the last visibility variant for each piece; frames retain
        // their own immutable references while stepping backwards.
        variants.clear();
        variants.set(signature, variant);
        return variant;
      });
      return frames.set(
        String(visibleCount),
        { visibleCount, orderedLayers },
        visibleCount,
      );
    },
  };
}

type ConstructionLayer = NonNullable<
  ReturnType<typeof prepareConstructionScene>
>["layers"][number];

type ConstructionOptions = Parameters<typeof prepareConstructionScene>[0];
type PreparedConstruction = NonNullable<
  ReturnType<typeof prepareConstructionScene>
>;
export type ConstructionPreviewAsset = {
  src: string;
  fingerprint: string;
  framing: PreparedConstruction["framing"];
  // JSON imports infer arrays rather than TypeScript tuples. The export test
  // verifies the two finite coordinates for every generated preview.
  center: readonly number[];
  sceneSize: PreparedConstruction["sceneSize"];
  placements: number;
};

// Increment after changing piece drawing rules, then regenerate preview assets.
const CONSTRUCTION_RENDERER_VERSION = "manga-6";
const fingerprints = new WeakMap<object, string>();
export function constructionPreviewFingerprint(recipeId: string) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe) return "";
  const cached = fingerprints.get(recipe);
  if (cached) return cached;
  const source = JSON.stringify([
    CONSTRUCTION_RENDERER_VERSION,
    recipe.previewRotation,
    recipe.placements,
    [...new Set(recipe.placements.map((p) => p.modelId))].map(
      (id) => CATALOG.find((brigo) => brigo.model.id === id)?.model,
    ),
    COLORS,
  ]);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++)
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  const fingerprint = (hash >>> 0).toString(16);
  fingerprints.set(recipe, fingerprint);
  return fingerprint;
}

const scenes = createConstructionCache<PreparedConstruction>(4, 9000);
const snapshots = createConstructionCache<string>(16, 8_000_000);
const recipeKeys = new WeakMap<object, number>();
let nextRecipeKey = 0;
function constructionCacheKey(options: ConstructionOptions) {
  const recipe = RECIPE_BY_ID.get(options.recipeId);
  if (!recipe) return "";
  if (!recipeKeys.has(recipe)) recipeKeys.set(recipe, ++nextRecipeKey);
  return JSON.stringify([
    recipeKeys.get(recipe),
    options.rotation ?? 0,
    options.color,
    options.pieces,
  ]);
}
function cachedConstruction(options: ConstructionOptions) {
  const key = constructionCacheKey(options);
  const cached = scenes.get(key);
  if (cached) return cached;
  const scene = prepareConstructionScene(options);
  return scene ? scenes.set(key, scene, scene.layers.length) : null;
}

const xml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

/** Only internal geometry is serialized. Text, URLs and player input never become SVG markup. */
export function serializeConstructionFrame(
  scene: PreparedConstruction,
  step?: number,
) {
  const frame = scene.frame(step);
  let content = "";
  let instances = "";
  const symbols = new Map<Primitive[], string>();
  // Merge adjacent paths with the same paint, retaining their exact painter
  // order and every original piece. This reduces both SVG decode and filesize.
  let previousStyle = "";
  let pending = "";
  const flush = () => {
    if (pending) content += `<path ${previousStyle} d="${xml(pending)}"/>`;
    pending = "";
  };
  const append = (
    d: string,
    fill: string,
    stroke?: string,
    opacity?: number,
    strokeWidth?: number,
  ) => {
    const style = `fill="${xml(fill)}"${stroke ? ` stroke="${xml(stroke)}"` : ""}${opacity !== undefined ? ` opacity="${opacity}"` : ""}${strokeWidth !== undefined ? ` stroke-width="${strokeWidth}"` : ""}`;
    if (style !== previousStyle) {
      flush();
      previousStyle = style;
    }
    pending += d;
  };
  for (const layer of frame.orderedLayers) {
    let symbol = symbols.get(layer.primitives);
    if (!symbol) {
      symbol = `piece${symbols.size}`;
      symbols.set(layer.primitives, symbol);
      flush();
      content += `<g id="${symbol}">`;
      for (const primitive of layer.primitives) {
        append(
          primitive.d,
          primitive.fill,
          primitive.stroke,
          primitive.opacity,
          primitive.strokeWidth,
        );
        if (primitive.hatching)
          append(primitive.hatching, "none", MANGA_INK, 0.43, 0.7);
        if (primitive.brush) append(primitive.brush, MANGA_INK, "none", 0.85);
        if (primitive.highlight)
          append(primitive.highlight, "none", MANGA_HIGHLIGHT, 0.82, 0.9);
      }
      flush();
      content += "</g>";
    }
    instances += `<use href="#${symbol}" transform="translate(${layer.offset[0]} ${layer.offset[1]})"/>`;
  }
  flush();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${xml(scene.framing.viewBox)}"><g stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round"><defs>${content}</defs>${instances}</g></svg>`;
}

function constructionSnapshot(options: ConstructionOptions, step?: number) {
  const key = `${constructionCacheKey(options)}:${step ?? "all"}`;
  const cached = snapshots.get(key);
  const scene = cachedConstruction(options);
  if (!scene) return null;
  if (cached) return { scene, href: cached };
  const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeConstructionFrame(scene, step))}`;
  return { scene, href: snapshots.set(key, href, href.length) };
}

function ConstructionPreview({
  recipeId,
  className = "",
  pieces,
  step,
  rotation = 0,
  color,
}: ConstructionOptions & { className?: string; step?: number }) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  const asset = (
    constructionPreviews as Record<string, ConstructionPreviewAsset>
  )[recipeId];
  const useAsset =
    !!asset &&
    rotation === 0 &&
    !color &&
    (!pieces ||
      Object.keys(pieces).length === 0 ||
      recipe?.placements.every((placement) => placement.colorId)) &&
    (step === undefined || step === asset.placements) &&
    asset.fingerprint === constructionPreviewFingerprint(recipeId);
  const snapshot = useMemo(
    () =>
      useAsset
        ? null
        : constructionSnapshot({ recipeId, pieces, rotation, color }, step),
    [recipeId, pieces, rotation, color, step, useAsset],
  );
  const framing = useAsset ? asset.framing : snapshot?.scene.framing;
  const center = useAsset ? asset.center : snapshot?.scene.center;
  const sceneSize = useAsset ? asset.sceneSize : snapshot?.scene.sceneSize;
  if (!recipe || !framing || !center || !sceneSize) return null;
  const overviewFraming =
    step === undefined
      ? {
          ...framing,
          minX: framing.minX - framing.width * 0.08,
          minY: framing.minY - framing.height * 0.15,
          width: framing.width * 1.16,
          height: framing.height * 1.2,
        }
      : framing;
  const viewBox = `${overviewFraming.minX} ${overviewFraming.minY} ${overviewFraming.width} ${overviewFraming.height}`;
  const placements =
    step === undefined
      ? recipe.placements.length
      : Math.max(
          0,
          Math.min(
            recipe.placements.length,
            Number.isFinite(step) ? Math.floor(step) : 0,
          ),
        );
  return (
    <svg
      viewBox={viewBox}
      className={`construction-art ${className}`}
      aria-hidden="true"
      data-art-style="ink"
      data-art-finish="manga"
      data-placements={placements}
      data-rotation={rotation}
      data-renderer={useAsset ? "precompiled" : "snapshot"}
    >
      {step === undefined && (
        <ConstructionBackdrop recipeId={recipeId} framing={overviewFraming} />
      )}
      <ellipse
        cx={center[0]}
        cy={center[1] + 3}
        rx={(sceneSize.width + sceneSize.depth) * 11}
        ry={(sceneSize.width + sceneSize.depth) * 3.8}
        fill="var(--scene-ink, #465568)"
        opacity=".12"
      />
      <image
        href={useAsset ? publicAssetUrl(asset.src) : snapshot!.href}
        x={framing.minX}
        y={framing.minY}
        width={framing.width}
        height={framing.height}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}

// Stable layer objects let React retain unchanged SVG paths in small assembly
// readers. Every shared cache is explicitly bounded in entries and weight.
const ConstructionPiece = memo(function ConstructionPiece({
  layer,
}: {
  layer: ConstructionLayer;
}) {
  const { primitives, placement, brigo, visibleStudCount } = layer;
  return (
    <g
      key={placement.key}
      transform={`translate(${layer.offset[0]} ${layer.offset[1]})`}
      data-piece={placement.key}
      data-visible-studs={visibleStudCount}
    >
      {primitives.map((primitive, index) => (
        <Fragment key={index}>
          <path
            d={primitive.d}
            fill={primitive.fill}
            stroke={primitive.stroke}
            strokeWidth={primitive.strokeWidth}
            opacity={primitive.opacity}
            data-placement={placement.key}
            data-model={placement.modelId}
            data-brigo={brigo.id}
          />
          <InkDetails primitive={primitive} />
        </Fragment>
      ))}
    </g>
  );
});

const ConstructionVectorArt = memo(function ConstructionVectorArt({
  recipeId,
  className = "",
  pieces,
  step,
  rotation = 0,
  color,
}: {
  recipeId: string;
  className?: string;
  pieces?: Record<string, number>;
  step?: number;
  rotation?: Rotation;
  color?: string;
}) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  const scene = useMemo(
    () => cachedConstruction({ recipeId, pieces, rotation, color }),
    [recipeId, recipe, pieces, rotation, color],
  );
  const frame = useMemo(() => scene?.frame(step), [scene, step]);
  const drawings = useMemo(
    () =>
      new Map(
        scene?.layers.map(
          (layer) =>
            [
              layer,
              <ConstructionPiece key={layer.placement.key} layer={layer} />,
            ] as const,
        ),
      ),
    [scene],
  );
  if (!scene || !frame) return null;
  const { framing, sceneSize, center } = scene;
  const { visibleCount, orderedLayers } = frame;
  return (
    <svg
      viewBox={framing.viewBox}
      className={`construction-art ${className}`}
      aria-hidden="true"
      data-art-style="ink"
      data-art-finish="manga"
      data-placements={visibleCount}
      data-rotation={rotation}
      data-render-order={orderedLayers
        .map((layer) => layer.placement.key)
        .join(",")}
    >
      {step === undefined && (
        <ConstructionBackdrop recipeId={recipeId} framing={framing} />
      )}
      <ellipse
        cx={center[0]}
        cy={center[1] + 3}
        rx={(sceneSize.width + sceneSize.depth) * 11}
        ry={(sceneSize.width + sceneSize.depth) * 3.8}
        fill="var(--scene-ink, #465568)"
        opacity=".12"
      />
      <g strokeWidth="1.55" strokeLinejoin="round" strokeLinecap="round">
        {orderedLayers.map(
          (layer) =>
            drawings.get(layer) ?? (
              <ConstructionPiece key={layer.placement.key} layer={layer} />
            ),
        )}
      </g>
    </svg>
  );
});

type ConstructionArtProps = ConstructionOptions & {
  className?: string;
  step?: number;
  quality?: "detail" | "preview";
};
export const ConstructionArt = memo(function ConstructionArt({
  quality = "detail",
  ...props
}: ConstructionArtProps) {
  return quality === "preview" ? (
    <ConstructionPreview {...props} />
  ) : (
    <ConstructionVectorArt {...props} />
  );
});
