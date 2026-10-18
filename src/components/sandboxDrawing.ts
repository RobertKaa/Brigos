import { BRIGO_BY_ID } from "../game/catalog";
import {
  prepareSceneOrder,
  rotateModelPoint,
  rotatedSize,
} from "../game/geometry";
import type { Point3, Rotation } from "../game/geometry";
import { SANDBOX_GRID_SIZE } from "../game/sandbox";
import type { SandboxPlacement } from "../game/sandbox";
import { brigoGeometry } from "./BrigoScene";
import { createConstructionCache } from "./constructionCache";
const boardSize = { width: SANDBOX_GRID_SIZE, depth: SANDBOX_GRID_SIZE };
const meshCache = createConstructionCache<ReturnType<typeof brigoGeometry>>(
  128,
  40_000,
);

/** Same projection and original faceted meshes as the construction viewer. */
export function projectSandboxPoint(point: Point3, rotation: Rotation = 0) {
  const p = rotateModelPoint(boardSize, point, rotation);
  return { x: (p.x - p.y) * 25, y: (p.x + p.y) * 12.5 - p.z * 7 };
}

function meshFor(brigoId: string, rotation: Rotation) {
  const brigo = BRIGO_BY_ID.get(brigoId);
  if (!brigo) return null;
  const key = `${brigoId}:${rotation}`;
  return (
    meshCache.get(key) ??
    (() => {
      const mesh = brigoGeometry(brigo, rotation);
      return meshCache.set(key, mesh, mesh.primitives.length);
    })()
  );
}

/** Prepared once per edit/camera turn; moving the cursor never sorts the scene. */
export function prepareSandboxDrawing(
  placements: readonly SandboxPlacement[],
  cameraRotation: Rotation = 0,
) {
  const layers = placements.flatMap((placement) => {
    const brigo = BRIGO_BY_ID.get(placement.brigoId);
    if (!brigo) return [];
    const rotation = ((placement.rotation + cameraRotation) % 360) as Rotation;
    const mesh = meshFor(brigo.id, rotation)!;
    const placedSize = rotatedSize(brigo.model, placement.rotation);
    const origin = projectSandboxPoint(placement, cameraRotation);
    const localOrigin = rotateModelPoint(
      brigo.model,
      { x: 0, y: 0, z: 0 },
      rotation,
    );
    const placementOrigin = rotateModelPoint(
      brigo.model,
      { x: 0, y: 0, z: 0 },
      placement.rotation,
    );
    const worldOrigin = projectSandboxPoint(
      {
        x: placement.x + placementOrigin.x,
        y: placement.y + placementOrigin.y,
        z: placement.z,
      },
      cameraRotation,
    );
    const offset = {
      x: worldOrigin.x - (localOrigin.x - localOrigin.y) * 25,
      y: worldOrigin.y - (localOrigin.x + localOrigin.y) * 12.5,
    };
    const corners = [placement.x, placement.x + placedSize.width].flatMap((x) =>
      [placement.y, placement.y + placedSize.depth].flatMap((y) =>
        [placement.z, placement.z + brigo.model.height].map((z) =>
          rotateModelPoint(boardSize, { x, y, z }, cameraRotation),
        ),
      ),
    );
    return [
      {
        placement,
        brigo,
        mesh,
        rotation,
        origin,
        offset,
        key: `${brigo.id}:${rotation}`,
        worldBounds: {
          minX: Math.min(...corners.map((p) => p.x)),
          maxX: Math.max(...corners.map((p) => p.x)),
          minY: Math.min(...corners.map((p) => p.y)),
          maxY: Math.max(...corners.map((p) => p.y)),
          minZ: placement.z,
          maxZ: placement.z + brigo.model.height,
        },
        projectedBounds: {
          minX: mesh.minX + offset.x,
          maxX: mesh.minX + mesh.width + offset.x,
          minY: mesh.minY + offset.y,
          maxY: mesh.minY + mesh.height + offset.y,
        },
      },
    ];
  });
  return prepareSceneOrder(layers).sortVisible();
}
