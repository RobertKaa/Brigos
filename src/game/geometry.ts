import type { BrigoModel } from "./catalog";

export type Rotation = 0 | 90 | 180 | 270;
export interface Point2 {
  x: number;
  y: number;
}
export interface Point3 extends Point2 {
  z: number;
}

export interface Bounds3 {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
export interface ProjectedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ScenePartBounds {
  worldBounds: Bounds3;
  projectedBounds: ProjectedBounds;
}

export interface PreparedSceneOrder<T> {
  /** Sort an instruction prefix, without comparing the scene's bounds again. */
  sortVisible: (count?: number) => T[];
}

// A pair can influence painter order only if its projected rectangles or its
// world footprints overlap. The two grids keep the exact narrow-phase rules
// below, without comparing every far-away pair in a large construction.
function sceneCandidates<T extends ScenePartBounds>(parts: readonly T[]) {
  const divisions = Math.max(
    1,
    Math.min(48, Math.ceil(Math.sqrt(parts.length / 6))),
  );
  const indices = (["worldBounds", "projectedBounds"] as const).map((field) => {
    const rectangles = parts.map((part) => part[field]);
    const minX = Math.min(...rectangles.map((box) => box.minX));
    const minY = Math.min(...rectangles.map((box) => box.minY));
    const width = Math.max(...rectangles.map((box) => box.maxX)) - minX || 1;
    const height = Math.max(...rectangles.map((box) => box.maxY)) - minY || 1;
    const buckets = new Map<number, number[]>();
    const cells = rectangles.map((box) => {
      const x0 = Math.max(
        0,
        Math.min(
          divisions - 1,
          Math.floor(((box.minX - minX) / width) * divisions),
        ),
      );
      const x1 = Math.max(
        0,
        Math.min(
          divisions - 1,
          Math.floor(((box.maxX - minX) / width) * divisions),
        ),
      );
      const y0 = Math.max(
        0,
        Math.min(
          divisions - 1,
          Math.floor(((box.minY - minY) / height) * divisions),
        ),
      );
      const y1 = Math.max(
        0,
        Math.min(
          divisions - 1,
          Math.floor(((box.maxY - minY) / height) * divisions),
        ),
      );
      const result: number[] = [];
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) result.push(y * divisions + x);
      return result;
    });
    cells.forEach((row, index) =>
      row.forEach((cell) => {
        const bucket = buckets.get(cell);
        if (bucket) bucket.push(index);
        else buckets.set(cell, [index]);
      }),
    );
    return { cells, buckets };
  });
  return (index: number) => {
    const candidates = new Set<number>();
    for (const { cells, buckets } of indices)
      for (const cell of cells[index])
        for (const other of buckets.get(cell)!)
          if (other > index) candidates.add(other);
    // Prefix graph degrees rely on increasing index order, just as in the
    // original all-pairs traversal.
    return [...candidates].sort((a, b) => a - b);
  };
}

/** The scene and its bounds must stay unchanged while the prepared order is used. */
export function prepareSceneOrder<T extends ScenePartBounds>(
  parts: readonly T[],
): PreparedSceneOrder<T> {
  const edges: number[][] = parts.map(() => []);
  const incoming: number[][] = parts.map(() => []);
  const stackEdges: number[][] = parts.map(() => []);
  const stackIncoming: number[][] = parts.map(() => []);
  const epsilon = 0.00001;
  const candidates = parts.length > 64 ? sceneCandidates(parts) : undefined;
  for (let a = 0; a < parts.length; a++)
    for (const b of candidates
      ? candidates(a)
      : Array.from(
          { length: parts.length - a - 1 },
          (_, index) => a + index + 1,
        )) {
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
        stackEdges[from].push(to);
        stackIncoming[to].push(from);
        // A broad piece can cover a support's footprint without their actual
        // projected silhouettes touching (cutouts, rings, offset foliage).
        // Kahn readiness must still include this hard dependency; otherwise a
        // blocked "ready" piece repeatedly triggers the cycle fallback and
        // breaks unrelated, perfectly acyclic occlusion edges elsewhere.
        edges[from].push(to);
        incoming[to].push(from);
      }
      if (
        pa.maxX <= pb.minX + epsilon ||
        pb.maxX <= pa.minX + epsilon ||
        pa.maxY <= pb.minY + epsilon ||
        pb.maxY <= pa.minY + epsilon
      )
        continue;
      // All three camera axes increase toward the viewer. A separating plane
      // decides painter order only when no other axis says the opposite: such
      // contradictory boxes cannot overlap on a real viewing ray, even when
      // their projected rectangles overlap. Giving Z unconditional priority
      // creates false cycles between tall frames and neighbouring wall courses.
      const aBehind =
        wa.maxX <= wb.minX + epsilon ||
        wa.maxY <= wb.minY + epsilon ||
        wa.maxZ <= wb.minZ + epsilon;
      const bBehind =
        wb.maxX <= wa.minX + epsilon ||
        wb.maxY <= wa.minY + epsilon ||
        wb.maxZ <= wa.minZ + epsilon;
      const direction = aBehind !== bBehind ? (aBehind ? 1 : -1) : 0;
      if (direction && !stackDirection) {
        const from = direction === 1 ? a : b,
          to = direction === 1 ? b : a;
        edges[from].push(to);
        incoming[to].push(from);
      }
    }
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
  const depthOrder = parts
    .map((_, index) => index)
    .sort((a, b) => depth(a) - depth(b) || a - b);
  const ranks = new Int32Array(parts.length);
  depthOrder.forEach((index, rank) => (ranks[index] = rank));
  // Pair traversal appends both incoming and outgoing indices in increasing
  // order. Prefix degrees can therefore be found without scanning hidden edges.
  return createPreparedSceneOrder(parts, {
    edges: edges.map((row) => Int32Array.from(row)),
    incoming: incoming.map((row) => Int32Array.from(row)),
    stackEdges: stackEdges.map((row) => Int32Array.from(row)),
    stackIncoming: stackIncoming.map((row) => Int32Array.from(row)),
    ranks,
  });
}

interface SceneOrderGraph {
  edges: Int32Array[];
  incoming: Int32Array[];
  stackEdges: Int32Array[];
  stackIncoming: Int32Array[];
  ranks: Int32Array;
}

function prefixLength(indices: Int32Array, count: number): number {
  let lower = 0;
  let upper = indices.length;
  while (lower < upper) {
    const middle = (lower + upper) >>> 1;
    if (indices[middle] < count) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}

function rankedHeap(ranks: Int32Array) {
  const heap: number[] = [];
  const push = (index: number) => {
    let position = heap.push(index) - 1;
    while (position > 0) {
      const parent = Math.floor((position - 1) / 2);
      if (ranks[heap[parent]] <= ranks[index]) break;
      heap[position] = heap[parent];
      position = parent;
    }
    heap[position] = index;
  };
  const pop = () => {
    if (!heap.length) return undefined;
    const result = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let position = 0;
      while (position * 2 + 1 < heap.length) {
        let child = position * 2 + 1;
        if (
          child + 1 < heap.length &&
          ranks[heap[child + 1]] < ranks[heap[child]]
        )
          child++;
        if (ranks[last] <= ranks[heap[child]]) break;
        heap[position] = heap[child];
        position = child;
      }
      heap[position] = last;
    }
    return result;
  };
  return { push, pop };
}

function createPreparedSceneOrder<T>(
  parts: readonly T[],
  graph: SceneOrderGraph,
): PreparedSceneOrder<T> {
  return {
    sortVisible(requestedCount = parts.length): T[] {
      const count = Number.isNaN(requestedCount)
        ? 0
        : Math.max(0, Math.min(parts.length, Math.floor(requestedCount)));
      const indegrees = new Int32Array(count);
      const stackIndegrees = new Int32Array(count);
      const remaining = new Uint8Array(count).fill(1);
      const ready = rankedHeap(graph.ranks);
      const stackReady = rankedHeap(graph.ranks);
      for (let index = 0; index < count; index++) {
        indegrees[index] = prefixLength(graph.incoming[index], count);
        stackIndegrees[index] = prefixLength(graph.stackIncoming[index], count);
        if (indegrees[index] === 0) ready.push(index);
        if (stackIndegrees[index] === 0) stackReady.push(index);
      }
      const result: T[] = [];
      while (result.length < count) {
        // Screen-space bounds can form soft cycles around arches. Resolve these
        // exactly as the uncached sort, while preserving the hard stack order.
        let next = ready.pop();
        if (next !== undefined && !remaining[next]) continue;
        if (next === undefined || stackIndegrees[next] > 0) {
          if (next !== undefined) ready.push(next);
          do {
            next = stackReady.pop();
          } while (next !== undefined && !remaining[next]);
        }
        if (next === undefined) break;
        remaining[next] = 0;
        result.push(parts[next]);
        for (const target of graph.stackEdges[next]) {
          if (target >= count) break;
          if (--stackIndegrees[target] === 0 && remaining[target])
            stackReady.push(target);
        }
        for (const target of graph.edges[next]) {
          if (target >= count) break;
          if (--indegrees[target] === 0 && remaining[target])
            ready.push(target);
        }
      }
      return result;
    },
  };
}

/** Painter order operates on whole pieces so a broad cap cannot cut through a roof. */
export function sortSceneParts<T extends ScenePartBounds>(
  parts: readonly T[],
): T[] {
  return prepareSceneOrder(parts).sortVisible();
}

export function rotatedSize(
  model: Pick<BrigoModel, "width" | "depth">,
  rotation: Rotation = 0,
) {
  return rotation === 90 || rotation === 270
    ? { width: model.depth, depth: model.width }
    : { width: model.width, depth: model.depth };
}

/** A quarter turn keeps the rotated piece inside a positive, normalized box. */
export function rotateModelPoint(
  model: Pick<BrigoModel, "width" | "depth">,
  point: Point3,
  rotation: Rotation = 0,
): Point3 {
  switch (rotation) {
    case 90:
      return { x: model.depth - point.y, y: point.x, z: point.z };
    case 180:
      return { x: model.width - point.x, y: model.depth - point.y, z: point.z };
    case 270:
      return { x: point.y, y: model.width - point.x, z: point.z };
    default:
      return { ...point };
  }
}

function occupiesCell(model: BrigoModel, x: number, y: number): boolean {
  if (model.shape === "corner") return x < 1 || y < 1;
  if (model.shape === "cross")
    return (
      x === Math.floor(model.width / 2) || y === Math.floor(model.depth / 2)
    );
  if (model.shape === "round" || model.shape === "cone")
    return (
      ((x + 0.5 - model.width / 2) / (model.width / 2)) ** 2 +
        ((y + 0.5 - model.depth / 2) / (model.depth / 2)) ** 2 <=
      1
    );
  return true;
}

export function footprintCells(
  model: BrigoModel,
  rotation: Rotation = 0,
): Point2[] {
  const cells: Point2[] = [];
  for (let y = 0; y < model.depth; y++)
    for (let x = 0; x < model.width; x++) {
      if (!occupiesCell(model, x, y)) continue;
      const center = rotateModelPoint(
        model,
        { x: x + 0.5, y: y + 0.5, z: 0 },
        rotation,
      );
      cells.push({ x: Math.floor(center.x), y: Math.floor(center.y) });
    }
  return cells;
}

export function studCenters(
  model: BrigoModel,
  rotation: Rotation = 0,
): Point2[] {
  if (!model.studs) return [];
  const centers: Point2[] = [];
  for (let y = 0; y < model.depth; y++)
    for (let x = 0; x < model.width; x++) {
      if (!occupiesCell(model, x, y)) continue;
      if (model.shape === "round" || model.shape === "cone") {
        // Leave room for the whole stud, including the edge of its round cap.
        const radius = 0.28;
        const dx = Math.abs(x + 0.5 - model.width / 2);
        const dy = Math.abs(y + 0.5 - model.depth / 2);
        const limitX = model.shape === "cone" ? 1 : model.width / 2;
        const limitY = model.shape === "cone" ? 1 : model.depth / 2;
        if (
          Array.from({ length: 24 }, (_, i) => (i * Math.PI) / 12).some(
            (angle) =>
              ((dx + Math.cos(angle) * radius) / limitX) ** 2 +
                ((dy + Math.sin(angle) * radius) / limitY) ** 2 >
              1.00001,
          )
        )
          continue;
      }
      const center = rotateModelPoint(
        model,
        { x: x + 0.5, y: y + 0.5, z: 0 },
        rotation,
      );
      centers.push({ x: center.x, y: center.y });
    }
  return centers;
}
