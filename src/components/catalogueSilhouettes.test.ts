import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BRIGO_BY_ID, MODELS } from "../game/catalog";
import type { BrigoModel } from "../game/catalog";
import type { Rotation } from "../game/geometry";
import { brigoGeometry } from "./BrigoScene";
import {
  BRIGO_HEIGHT_SCALE,
  createBrigoMeshLibrary,
} from "./sandbox3d/brigoMeshes";

type Point = [number, number];

function contains(polygon: Point[], [x, y]: Point) {
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

function nearEdge(polygon: Point[], sample: Point) {
  return polygon.some((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2
      ? Math.max(
          0,
          Math.min(
            1,
            ((sample[0] - a[0]) * dx + (sample[1] - a[1]) * dy) / length2,
          ),
        )
      : 0;
    return (
      Math.hypot(sample[0] - a[0] - t * dx, sample[1] - a[1] - t * dy) < 0.05
    );
  });
}

// Independent inversion of the illustrated camera. The physical meshes are
// never projected with the SVG renderer, and ink triangles never count as solid.
function localRay(model: BrigoModel, [x, y]: Point, rotation: Rotation) {
  const rx = x / 50 + y / 25,
    ry = y / 25 - x / 50;
  const [lx, ly] =
    rotation === 90
      ? [ry, model.depth - rx]
      : rotation === 180
        ? [model.width - rx, model.depth - ry]
        : rotation === 270
          ? [model.width - ry, rx]
          : [rx, ry];
  const towardViewer = new THREE.Vector3(
    rotation === 0 || rotation === 90 ? 1 : -1,
    (25 / 7) * BRIGO_HEIGHT_SCALE,
    rotation === 0 || rotation === 270 ? 1 : -1,
  ).normalize();
  const origin = new THREE.Vector3(lx, 0, ly).addScaledVector(towardViewer, 50);
  return new THREE.Raycaster(origin, towardViewer.negate());
}

describe("silhouettes physiques de tout le catalogue", () => {
  it.each(MODELS.map((model) => [model.id, model] as const))(
    "%s conserve ses ouvertures et ses pleins dans les quatre vues",
    (_id, model) => {
      const brigo = BRIGO_BY_ID.get(`${model.id}:ivory`)!;
      const library = createBrigoMeshLibrary();
      try {
        const group = library.create(brigo);
        group.updateMatrixWorld(true);
        const solids = group.children.filter(
          (child) => child instanceof THREE.Mesh && !child.userData.brigoInk,
        );
        for (const rotation of [0, 90, 180, 270] as const) {
          const drawing = brigoGeometry(brigo, rotation);
          const polygons = drawing.primitives
            .filter((primitive) => primitive.fill !== "none")
            .map((primitive) => primitive.points);
          const mismatches: Point[] = [];
          // Deliberately noncentral samples avoid coincident triangle diagonals.
          // Boundary-only differences below .05 SVG px are rounding, not holes.
          for (let row = 0; row < 19; row++)
            for (let column = 0; column < 19; column++) {
              const sample: Point = [
                drawing.minX + ((column + 0.371) / 19) * drawing.width,
                drawing.minY + ((row + 0.613) / 19) * drawing.height,
              ];
              if (polygons.some((polygon) => nearEdge(polygon, sample)))
                continue;
              const painted = polygons.some((polygon) =>
                contains(polygon, sample),
              );
              const physical =
                localRay(model, sample, rotation).intersectObjects(solids)
                  .length > 0;
              if (painted !== physical) mismatches.push(sample);
            }
          expect(
            mismatches,
            `${model.id} ${rotation}° : ${mismatches.length} différences entre le remplissage SVG et les triangles 3D`,
          ).toEqual([]);
        }
      } finally {
        library.dispose();
      }
    },
  );
});
