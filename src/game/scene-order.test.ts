import { describe, expect, it } from "vitest";
import { BRIGO_BY_ID, RECIPE_BY_ID } from "./catalog";
import { brigoGeometry } from "../components/BrigoArt";
import { prepareSceneOrder, rotateModelPoint } from "./geometry";
import type { Bounds3, ProjectedBounds, Rotation } from "./geometry";

// Straightforward all-pairs reference without spatial indexing or prefix caching.
// Visual occlusion itself is checked independently in assemblyOcclusion.test.ts.
function uncachedSortSceneParts<
  T extends { worldBounds: Bounds3; projectedBounds: ProjectedBounds },
>(parts: readonly T[]): T[] {
  const edges = parts.map(() => new Set<number>());
  const indegrees = parts.map(() => 0);
  const stackEdges = parts.map(() => new Set<number>());
  const stackIndegrees = parts.map(() => 0);
  const epsilon = 0.00001;
  for (let a = 0; a < parts.length; a++)
    for (let b = a + 1; b < parts.length; b++) {
      const pa = parts[a].projectedBounds,
        pb = parts[b].projectedBounds;
      const wa = parts[a].worldBounds,
        wb = parts[b].worldBounds;
      const sharesFootprint =
        wa.minX < wb.maxX - epsilon &&
        wb.minX < wa.maxX - epsilon &&
        wa.minY < wb.maxY - epsilon &&
        wb.minY < wa.maxY - epsilon;
      const stackDirection = !sharesFootprint
        ? 0
        : wa.maxZ <= wb.minZ + epsilon
          ? 1
          : wb.maxZ <= wa.minZ + epsilon
            ? -1
            : 0;
      if (stackDirection) {
        const from = stackDirection === 1 ? a : b,
          to = stackDirection === 1 ? b : a;
        stackEdges[from].add(to);
        stackIndegrees[to]++;
        edges[from].add(to);
      }
      if (
        pa.maxX <= pb.minX + epsilon ||
        pb.maxX <= pa.minX + epsilon ||
        pa.maxY <= pb.minY + epsilon ||
        pb.maxY <= pa.minY + epsilon
      )
        continue;
      const separators = new Set<number>();
      for (const axis of ["X", "Y", "Z"] as const) {
        if (wa[`max${axis}`] <= wb[`min${axis}`] + epsilon) separators.add(1);
        if (wb[`max${axis}`] <= wa[`min${axis}`] + epsilon) separators.add(-1);
      }
      // Opposite separating axes imply no shared viewing ray; overlapping
      // screen rectangles alone must not manufacture a painter dependency.
      const direction = separators.size === 1 ? [...separators][0] : 0;
      if (direction) {
        const from = direction === 1 ? a : b,
          to = direction === 1 ? b : a;
        edges[from].add(to);
      }
    }
  // Form the union before calculating degrees, including supports whose
  // projected silhouettes do not overlap the piece above them.
  for (const row of edges) for (const target of row) indegrees[target]++;
  const depth = (index: number) => {
    const box = parts[index].worldBounds;
    return (
      (box.minX +
        box.maxX +
        box.minY +
        box.maxY +
        (box.minZ + box.maxZ) * 0.72) /
      2
    );
  };
  const remaining = new Set(parts.map((_, index) => index));
  const depthOrder = [...remaining].sort(
    (a, b) => depth(a) - depth(b) || a - b,
  );
  const ranks = new Map(depthOrder.map((index, rank) => [index, rank]));
  const heap: number[] = [];
  const push = (index: number) => {
    let position = heap.push(index) - 1;
    while (position > 0) {
      const parent = Math.floor((position - 1) / 2);
      if (ranks.get(heap[parent])! <= ranks.get(index)!) break;
      heap[position] = heap[parent];
      position = parent;
    }
    heap[position] = index;
  };
  const pop = () => {
    const result = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let position = 0;
      while (position * 2 + 1 < heap.length) {
        let child = position * 2 + 1;
        if (
          child + 1 < heap.length &&
          ranks.get(heap[child + 1])! < ranks.get(heap[child])!
        )
          child++;
        if (ranks.get(last)! <= ranks.get(heap[child])!) break;
        heap[position] = heap[child];
        position = child;
      }
      heap[position] = last;
    }
    return result;
  };
  for (const index of remaining) if (indegrees[index] === 0) push(index);
  const result: T[] = [];
  while (remaining.size) {
    // Screen-space boxes can form ambiguous cycles around arches and galleries.
    // Break only those soft ties: a piece must always follow the pieces below it.
    let next = heap.length ? pop() : undefined;
    if (next !== undefined && !remaining.has(next)) continue;
    if (next === undefined || stackIndegrees[next] > 0) {
      if (next !== undefined) push(next);
      next = depthOrder.find(
        (index) => remaining.has(index) && stackIndegrees[index] === 0,
      )!;
    }
    if (!remaining.has(next)) continue;
    remaining.delete(next);
    result.push(parts[next]);
    for (const target of stackEdges[next]) stackIndegrees[target]--;
    for (const target of edges[next])
      if (--indegrees[target] === 0 && remaining.has(target)) push(target);
  }
  return result;
}

interface ScenePiece {
  key: string;
  worldBounds: Bounds3;
  projectedBounds: ProjectedBounds;
}

function recipeScene(recipeId: string, rotation: Rotation): ScenePiece[] {
  const recipe = RECIPE_BY_ID.get(recipeId)!;
  rotation = ((rotation + (recipe.previewRotation ?? 0)) % 360) as Rotation;
  const models = recipe.placements.map(
    (placement) => BRIGO_BY_ID.get(`${placement.modelId}:blue`)!.model,
  );
  const minX = Math.min(...recipe.placements.map((placement) => placement.x));
  const minY = Math.min(...recipe.placements.map((placement) => placement.y));
  const sceneSize = {
    width:
      Math.max(
        ...recipe.placements.map((placement, index) => {
          const model = models[index];
          return (
            placement.x + (placement.rotation % 180 ? model.depth : model.width)
          );
        }),
      ) - minX,
    depth:
      Math.max(
        ...recipe.placements.map((placement, index) => {
          const model = models[index];
          return (
            placement.y + (placement.rotation % 180 ? model.width : model.depth)
          );
        }),
      ) - minY,
  };
  return recipe.placements.map((placement, index) => {
    const model = models[index];
    const corners = [0, model.width].flatMap((x) =>
      [0, model.depth].flatMap((y) =>
        [0, model.height].map((z) => {
          const local = rotateModelPoint(
            model,
            { x, y, z },
            placement.rotation,
          );
          return rotateModelPoint(
            sceneSize,
            {
              x: local.x + placement.x - minX,
              y: local.y + placement.y - minY,
              z: local.z + placement.z,
            },
            rotation,
          );
        }),
      ),
    );
    const worldBounds = {
      minX: Math.min(...corners.map((corner) => corner.x)),
      maxX: Math.max(...corners.map((corner) => corner.x)),
      minY: Math.min(...corners.map((corner) => corner.y)),
      maxY: Math.max(...corners.map((corner) => corner.y)),
      minZ: Math.min(...corners.map((corner) => corner.z)),
      maxZ: Math.max(...corners.map((corner) => corner.z)),
    };
    const offsetX = (worldBounds.minX - worldBounds.minY) * 25;
    const offsetY =
      (worldBounds.minX + worldBounds.minY) * 12.5 - worldBounds.minZ * 7;
    const points = brigoGeometry(
      BRIGO_BY_ID.get(`${placement.modelId}:blue`)!,
      ((placement.rotation + rotation) % 360) as Rotation,
    )
      .primitives.filter(
        (primitive) =>
          recipe.placements.length <= 180 || primitive.surface !== "stud",
      )
      .flatMap((primitive) => primitive.points);
    return {
      key: placement.key,
      worldBounds,
      projectedBounds: {
        minX: Math.min(...points.map(([x]) => x)) + offsetX,
        maxX: Math.max(...points.map(([x]) => x)) + offsetX,
        minY: Math.min(...points.map(([, y]) => y)) + offsetY,
        maxY: Math.max(...points.map(([, y]) => y)) + offsetY,
      },
    };
  });
}

function generatedScene(seed: number, count: number): ScenePiece[] {
  let state = seed;
  const integer = (limit: number) => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) % limit;
  };
  return Array.from({ length: count }, (_, index) => {
    const x = integer(12),
      y = integer(12),
      z = integer(8);
    const width = integer(6) + 1,
      depth = integer(6) + 1;
    // Broad overlapping screen bounds deliberately exercise ambiguous cycles.
    return {
      key: String(index),
      worldBounds: {
        minX: x,
        maxX: x + width,
        minY: y,
        maxY: y + depth,
        minZ: z,
        maxZ: z + integer(4) + 1,
      },
      projectedBounds: {
        minX: integer(3),
        maxX: 30 + integer(3),
        minY: integer(3),
        maxY: 30 + integer(3),
      },
    };
  });
}

describe("ordre préparé des étapes", () => {
  it("écarte spatialement les paires éloignées au lieu de relire n² bornes", () => {
    let reads = 0;
    const parts = Array.from({ length: 1000 }, (_, index) => {
      const x = (index % 40) * 10;
      const y = Math.floor(index / 40) * 10;
      return {
        key: String(index),
        get worldBounds() {
          reads++;
          return {
            minX: x,
            maxX: x + 1,
            minY: y,
            maxY: y + 1,
            minZ: 0,
            maxZ: 1,
          };
        },
        get projectedBounds() {
          reads++;
          return { minX: x, maxX: x + 1, minY: y, maxY: y + 1 };
        },
      };
    });
    const prepared = prepareSceneOrder(parts);
    expect(prepared.sortVisible()).toHaveLength(parts.length);
    expect(reads).toBeLessThan(parts.length ** 2 / 10);
    expect(prepared.sortVisible()).toEqual(uncachedSortSceneParts(parts));
  });
  it("garde l’ordre exact de chaque préfixe même avec les cycles de projection", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const parts = generatedScene(seed, 32);
      const prepared = prepareSceneOrder(parts);
      // Move forwards and backwards to catch mutable state retained by a sort.
      for (const count of Array.from(
        { length: parts.length + 1 },
        (_, index) => index,
      ).reverse())
        expect(
          prepared.sortVisible(count).map((part) => part.key),
          `${seed}/${count}`,
        ).toEqual(
          uncachedSortSceneParts(parts.slice(0, count)).map((part) => part.key),
        );
      expect(prepared.sortVisible()).toEqual(uncachedSortSceneParts(parts));
    }
  });

  it("ne remplace pas le tri du préfixe par un filtrage du tri complet", () => {
    let differingPrefixes = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const parts = generatedScene(seed, 24);
      const full = uncachedSortSceneParts(parts);
      for (let count = 2; count < parts.length; count++) {
        const filtered = full
          .filter((part) => Number(part.key) < count)
          .map((part) => part.key);
        const prefix = uncachedSortSceneParts(parts.slice(0, count)).map(
          (part) => part.key,
        );
        if (filtered.join(",") !== prefix.join(",")) differingPrefixes++;
      }
    }
    expect(differingPrefixes).toBeGreaterThan(0);
  });

  it.each([
    "tree",
    "ocean-schooner",
    "tropical-conservatory",
    "astreval-gardens",
    "aurora-palace",
    "high-citadel",
  ])(
    "garde le tri préparé de %s équivalent au tri complet dans les quatre vues",
    (recipeId) => {
      for (const rotation of [0, 90, 180, 270] as const) {
        const parts = recipeScene(recipeId, rotation);
        const prepared = prepareSceneOrder(parts);
        const counts = new Set([
          0,
          1,
          2,
          12,
          Math.floor(parts.length / 3),
          Math.floor(parts.length / 2),
          parts.length - 1,
          parts.length,
        ]);
        for (const count of counts) {
          const expected = uncachedSortSceneParts(parts.slice(0, count));
          expect(
            prepared.sortVisible(count).map((part) => part.key),
            `${recipeId}/${rotation}/${count}`,
          ).toEqual(expected.map((part) => part.key));
        }
      }
    },
    30000,
  );

  it("ne relit aucune borne entre les étapes après la préparation", () => {
    let boundsReads = 0;
    const parts = generatedScene(7, 50).map((part) => ({
      key: part.key,
      get worldBounds() {
        boundsReads++;
        return part.worldBounds;
      },
      get projectedBounds() {
        boundsReads++;
        return part.projectedBounds;
      },
    }));
    const prepared = prepareSceneOrder(parts);
    expect(boundsReads).toBeGreaterThan(0);
    boundsReads = 0;
    for (const count of [50, 49, 20, 1, 0, 25, 50])
      expect(prepared.sortVisible(count)).toHaveLength(count);
    expect(boundsReads).toBe(0);
  });

  it("normalise le compteur visible et retourne une nouvelle liste sans modifier la scène", () => {
    const parts = generatedScene(11, 8);
    const original = [...parts];
    const prepared = prepareSceneOrder(parts);
    expect(prepared.sortVisible(-1)).toEqual([]);
    expect(prepared.sortVisible(NaN)).toEqual([]);
    expect(prepared.sortVisible(2.9)).toHaveLength(2);
    expect(prepared.sortVisible(Infinity)).toHaveLength(8);
    expect(prepared.sortVisible(-Infinity)).toEqual([]);
    const sorted = prepared.sortVisible();
    sorted.pop();
    expect(prepared.sortVisible()).toHaveLength(8);
    expect(parts).toEqual(original);
    expect(prepareSceneOrder([]).sortVisible()).toEqual([]);
  });
});
