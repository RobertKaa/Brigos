import { Matrix4, Vector3 } from "three";
import { BRIGO_BY_ID } from "../../game/catalog";
import { rotatedSize } from "../../game/geometry";
import type { Point3 } from "../../game/geometry";
import { SANDBOX_GRID_SIZE } from "../../game/sandbox";
import type { SandboxPlacement } from "../../game/sandbox";

/** The game keeps plate-height units; Three uses the horizontal cell as a unit. */
export const SANDBOX_HEIGHT_SCALE = 0.34;

export function toWorldPoint(point: Point3): Vector3 {
  return new Vector3(point.x, point.z * SANDBOX_HEIGHT_SCALE, point.y);
}

/** Transform a model already expressed in Three axes, preserving its normalized footprint. */
export function placementTransform(placement: SandboxPlacement): Matrix4 {
  const matrix = new Matrix4();
  const model = BRIGO_BY_ID.get(placement.brigoId)?.model;
  const { x, y, z, rotation } = placement;
  if (!model) return matrix.makeTranslation(x, z * SANDBOX_HEIGHT_SCALE, y);
  // Explicit quarter turns avoid floating-point drift at the cell boundaries.
  switch (rotation) {
    case 90:
      return matrix.set(
        0,
        0,
        -1,
        x + model.depth,
        0,
        1,
        0,
        z * SANDBOX_HEIGHT_SCALE,
        1,
        0,
        0,
        y,
        0,
        0,
        0,
        1,
      );
    case 180:
      return matrix.set(
        -1,
        0,
        0,
        x + model.width,
        0,
        1,
        0,
        z * SANDBOX_HEIGHT_SCALE,
        0,
        0,
        -1,
        y + model.depth,
        0,
        0,
        0,
        1,
      );
    case 270:
      return matrix.set(
        0,
        0,
        1,
        x,
        0,
        1,
        0,
        z * SANDBOX_HEIGHT_SCALE,
        -1,
        0,
        0,
        y + model.width,
        0,
        0,
        0,
        1,
      );
    default:
      return matrix.makeTranslation(x, z * SANDBOX_HEIGHT_SCALE, y);
  }
}

/** A hit on a side or connector still aims at a cell of that piece's top footprint. */
export function cellFromWorldPoint(
  point: { x: number; y: number; z: number },
  support?: SandboxPlacement,
): { x: number; y: number } | null {
  if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
  let x = Math.floor(point.x);
  let y = Math.floor(point.z);
  if (support) {
    const model = BRIGO_BY_ID.get(support.brigoId)?.model;
    if (
      !model ||
      ![support.x, support.y, support.z].every(Number.isSafeInteger) ||
      ![0, 90, 180, 270].includes(support.rotation)
    )
      return null;
    const size = rotatedSize(model, support.rotation);
    if (
      support.x < 0 ||
      support.y < 0 ||
      support.x + size.width > SANDBOX_GRID_SIZE ||
      support.y + size.depth > SANDBOX_GRID_SIZE
    )
      return null;
    x = Math.max(support.x, Math.min(support.x + size.width - 1, x));
    y = Math.max(support.y, Math.min(support.y + size.depth - 1, y));
  }
  return x >= 0 && y >= 0 && x < SANDBOX_GRID_SIZE && y < SANDBOX_GRID_SIZE
    ? { x, y }
    : null;
}

/** Frame the actual creation without losing the board context for a lone small piece. */
export function sandboxCameraFrame(placements: readonly SandboxPlacement[]): {
  target: Vector3;
  distance: number;
} {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const placement of placements) {
    const model = BRIGO_BY_ID.get(placement.brigoId)?.model;
    if (
      !model ||
      ![placement.x, placement.y, placement.z].every(Number.isFinite)
    )
      continue;
    const size = rotatedSize(model, placement.rotation);
    minX = Math.min(minX, placement.x);
    maxX = Math.max(maxX, placement.x + size.width);
    minY = Math.min(minY, placement.y);
    maxY = Math.max(maxY, placement.y + size.depth);
    minZ = Math.min(minZ, placement.z);
    maxZ = Math.max(maxZ, placement.z + model.height);
  }
  if (minX === Infinity)
    return { target: new Vector3(12, 0, 12), distance: 34 };
  const target = toWorldPoint({
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  });
  const radius =
    Math.hypot(maxX - minX, maxY - minY, (maxZ - minZ) * SANDBOX_HEIGHT_SCALE) /
    2;
  const distance = Math.max(
    8,
    Math.min(55, (radius * 1.2) / Math.sin(Math.PI / 9)),
  );
  return { target, distance };
}

/** Orbiting and multi-touch gestures must never place a piece when released. */
export function isSceneTap(
  start: { x: number; y: number },
  end: { x: number; y: number },
  multiplePointers: boolean,
): boolean {
  return (
    !multiplePointers &&
    [start.x, start.y, end.x, end.y].every(Number.isFinite) &&
    Math.hypot(end.x - start.x, end.y - start.y) <= 6
  );
}
