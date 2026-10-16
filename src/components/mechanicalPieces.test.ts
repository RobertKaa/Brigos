import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BRIGO_BY_ID } from "../game/catalog";
import type { Brigo } from "../game/catalog";
import type { Rotation } from "../game/geometry";
import { brigoGeometry } from "./BrigoScene";
import {
  BRIGO_HEIGHT_SCALE,
  createBrigoMeshLibrary,
} from "./sandbox3d/brigoMeshes";

type Point = [number, number];
type LocalPoint = [number, number, number];

function covers(polygon: Point[], [x, y]: Point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

function projected(
  brigo: Brigo,
  [x, y, z]: LocalPoint,
  rotation: Rotation,
): Point {
  const { width: w, depth: d } = brigo.model;
  const [rx, ry] =
    rotation === 90
      ? [d - y, x]
      : rotation === 180
        ? [w - x, d - y]
        : rotation === 270
          ? [y, w - x]
          : [x, y];
  return [(rx - ry) * 25, (rx + ry) * 12.5 - z * 7];
}

function tinted(hex: string, offset: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((index) =>
        Math.max(
          0,
          Math.min(255, parseInt(hex.slice(index, index + 2), 16) + offset),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// First intersections with the real 3D triangles independently confirm which
// solid is physically in front. No inferred normal or SVG centroid decides it.
function assertPaint(
  brigo: Brigo,
  rotation: Rotation,
  samples: { point: LocalPoint; role: string; fill: string; context: string }[],
) {
  const library = createBrigoMeshLibrary();
  try {
    const group = library.create(brigo);
    group.updateMatrixWorld(true);
    const meshes = group.children.filter(
      (child) => child instanceof THREE.Mesh && !child.userData.brigoInk,
    );
    const towardViewer = new THREE.Vector3(
      rotation === 0 || rotation === 90 ? 1 : -1,
      (25 / 7) * BRIGO_HEIGHT_SCALE,
      rotation === 0 || rotation === 270 ? 1 : -1,
    ).normalize();
    const primitives = brigoGeometry(brigo, rotation).primitives;
    for (const { point, role, fill, context } of samples) {
      const target = new THREE.Vector3(
        point[0],
        point[2] * BRIGO_HEIGHT_SCALE,
        point[1],
      );
      const ray = new THREE.Raycaster(
        target.clone().addScaledVector(towardViewer, 20),
        towardViewer.clone().negate(),
      );
      const hit = ray.intersectObjects(meshes)[0];
      expect(
        hit?.object.name,
        `${rotation}° ${context} premier solide 3D`,
      ).toBe(role);
      expect(
        hit.point.distanceTo(target),
        `${rotation}° ${context} profondeur réelle`,
      ).toBeLessThan(0.00001);
      const pixel = projected(brigo, point, rotation);
      const painted = primitives
        .filter((p) => p.fill !== "none" && covers(p.points, pixel))
        .at(-1);
      expect(
        painted?.fill,
        `${rotation}° ${context} à ${pixel.join(",")}`,
      ).toBe(fill);
    }
  } finally {
    library.dispose();
  }
}

describe("profondeur des mécanismes composés", () => {
  it.each([0, 90, 180, 270] as const)(
    "les ailes masquent leur axe métallique à %s°",
    (rotation) => {
      const brigo = BRIGO_BY_ID.get("special-hinge:ivory")!;
      const point: LocalPoint =
        rotation === 0
          ? [0.65, 0.88, 1.75]
          : rotation === 90
            ? [1.35, 1.2, 2]
            : rotation === 180
              ? [1.35, 1.12, 1.75]
              : [0.65, 0.8, 2];
      assertPaint(brigo, rotation, [
        {
          point,
          role: "body",
          fill: tinted(
            brigo.color.hex,
            rotation === 0 || rotation === 180 ? -17 : 21,
          ),
          context: "aile devant le mécanisme qui culmine à 1,66",
        },
      ]);
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "les colliers et l’essieu exposé gardent leur profondeur à %s°",
    (rotation) => {
      const brigo = BRIGO_BY_ID.get("special-axle:ivory")!;
      const hiddenMetal: LocalPoint =
        rotation === 0
          ? [0.25, 0.6, 1]
          : rotation === 90
            ? [2.314, 0.655, 0.8]
            : rotation === 180
              ? [3.75, 0.4, 1]
              : [1.686, 0.345, 0.8];
      const onCollar = rotation === 0 || rotation === 180;
      assertPaint(brigo, rotation, [
        {
          point: hiddenMetal,
          role: onCollar ? "body" : "metal",
          fill: onCollar ? tinted(brigo.color.hex, 21) : "#647187",
          context: onCollar
            ? "collier au-dessus du métal encastré"
            : "métal libre devant le collier central",
        },
        ...[0.285, 0.715].map((y) => ({
          point: [
            rotation === 0 || rotation === 90 ? 2.275 : 1.725,
            y,
            0.8,
          ] as LocalPoint,
          role: "metal",
          fill: "#647187",
          context: "pointe métallique conservée hors du chanfrein central",
        })),
      ]);
    },
  );
});
