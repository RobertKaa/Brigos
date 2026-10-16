import * as THREE from "three";
import { BRIGO_BY_ID } from "../../game/catalog";
import type { SandboxPlacement } from "../../game/sandbox";
import type { createBrigoMeshLibrary } from "./brigoMeshes";
import { placementTransform } from "./picking";

export const SANDBOX_BATCH_THRESHOLD = 120;
type Library = ReturnType<typeof createBrigoMeshLibrary>;
type MeshMaterial = THREE.Material | THREE.Material[];

export interface PlacedBatch {
  group: THREE.Group;
  /** Physical surfaces only: shader-expanded ink must never participate in picking. */
  pickMeshes: THREE.Mesh[];
  /** Bounds retain the individual placement even when its mesh is instanced. */
  boundsById: Map<string, THREE.Box3>;
  dispose(): void;
}

interface MeshInstance {
  id: string;
  matrix: THREE.Matrix4;
}
interface MeshBucket {
  source: THREE.Mesh;
  instances: MeshInstance[];
}
/**
 * Small projects retain simple objects. Large ones share draw calls by model
 * and palette; their two-pixel ink is instanced independently of body colour.
 * All catalogue geometry and materials remain owned by the mesh library.
 */
export function buildPlacedBatch(
  placements: readonly SandboxPlacement[],
  library: Library,
): PlacedBatch {
  const group = new THREE.Group();
  group.name = "sandbox:placements";
  const pickMeshes: THREE.Mesh[] = [];
  const boundsById = new Map<string, THREE.Box3>();
  const instancedMeshes: THREE.InstancedMesh[] = [];
  const meshBuckets = new Map<
    THREE.BufferGeometry,
    Map<MeshMaterial, MeshBucket>
  >();
  const batch = placements.length >= SANDBOX_BATCH_THRESHOLD;

  for (const placement of placements) {
    const brigo = BRIGO_BY_ID.get(placement.brigoId);
    if (!brigo) continue;
    const piece = library.create(brigo);
    piece.applyMatrix4(placementTransform(placement));
    piece.updateMatrixWorld(true);
    boundsById.set(placement.id, new THREE.Box3().setFromObject(piece));
    if (!batch) {
      piece.userData.placementId = placement.id;
      group.add(piece);
      piece.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.userData.brigoInk)
          pickMeshes.push(child);
      });
      continue;
    }

    piece.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        let byMaterial = meshBuckets.get(child.geometry);
        if (!byMaterial)
          meshBuckets.set(child.geometry, (byMaterial = new Map()));
        let bucket = byMaterial.get(child.material);
        if (!bucket)
          byMaterial.set(
            child.material,
            (bucket = { source: child, instances: [] }),
          );
        bucket.instances.push({
          id: placement.id,
          matrix: child.matrixWorld.clone(),
        });
      }
    });
  }

  for (const byMaterial of meshBuckets.values())
    for (const { source, instances } of byMaterial.values()) {
      const mesh = new THREE.InstancedMesh(
        source.geometry,
        source.material,
        instances.length,
      );
      mesh.name = `batch:${source.name}`;
      mesh.castShadow = source.castShadow;
      mesh.receiveShadow = source.receiveShadow;
      mesh.renderOrder = source.renderOrder;
      if (source.userData.brigoInk) {
        mesh.userData.brigoInk = true;
        mesh.raycast = () => {};
      }
      mesh.userData.placementIds = instances.map(({ id }) => id);
      instances.forEach(({ matrix }, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      instancedMeshes.push(mesh);
      if (!source.userData.brigoInk) pickMeshes.push(mesh);
      group.add(mesh);
    }

  let disposed = false;
  return {
    group,
    pickMeshes,
    boundsById,
    dispose() {
      if (disposed) return;
      disposed = true;
      instancedMeshes.forEach((mesh) => mesh.dispose());
      group.clear();
      pickMeshes.length = 0;
      boundsById.clear();
    },
  };
}
