import { COLORS, MODELS } from "./catalog";
import type { BrigoModel } from "./catalog";
import type { AssemblyPlacement, AssemblySpec } from "./assemblies";
import { footprintCells, rotateModelPoint, studCenters } from "./geometry";

export interface AssemblyIssue {
  type:
    | "unknown-model"
    | "unknown-color"
    | "invalid-position"
    | "duplicate-key"
    | "overlap"
    | "unsupported"
    | "instruction-order"
    | "disconnected";
  placementKey: string;
  otherKey?: string;
  message: string;
}

interface VolumeColumn {
  x: number;
  y: number;
  width: number;
  depth: number;
  bottom: number;
  top: number;
}

interface MechanicalPort {
  kind: "wheel" | "axle-end" | "axle-center" | "bearing";
  point: string;
  axis: "x" | "y";
  direction?: number;
}

interface LocatedPart {
  placement: AssemblyPlacement;
  model: BrigoModel;
  columns: VolumeColumn[];
  sockets: Set<string>;
  studs: Set<string>;
  mechanicalPorts: MechanicalPort[];
}

const cellKey = (x: number, y: number) => `${x},${y}`;

function locate(placement: AssemblyPlacement, model: BrigoModel): LocatedPart {
  const columns: VolumeColumn[] = [];
  const sockets = new Set<string>();
  const mechanicalPorts: MechanicalPort[] = [];
  const framed =
    model.shape === "arch" ||
    model.shape === "window" ||
    model.shape === "door";
  const addColumn = (x: number, y: number, bottom: number, top: number) => {
    const rotated = rotateModelPoint(
      model,
      { x: x + 0.5, y: y + 0.5, z: 0 },
      placement.rotation,
    );
    columns.push({
      x: placement.x + Math.floor(rotated.x),
      y: placement.y + Math.floor(rotated.y),
      width: 1,
      depth: 1,
      bottom: placement.z + bottom,
      top: placement.z + top,
    });
  };
  const addBox = (
    x: number,
    y: number,
    width: number,
    depth: number,
    bottom: number,
    top: number,
  ) => {
    const a = rotateModelPoint(model, { x, y, z: 0 }, placement.rotation);
    const b = rotateModelPoint(
      model,
      { x: x + width, y: y + depth, z: 0 },
      placement.rotation,
    );
    columns.push({
      x: placement.x + Math.min(a.x, b.x),
      y: placement.y + Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      depth: Math.abs(a.y - b.y),
      bottom: placement.z + bottom,
      top: placement.z + top,
    });
  };
  if (framed) {
    for (let y = 0; y < model.depth; y++)
      for (let x = 0; x < model.width; x++) {
        const pillar = y === 0 || y === model.depth - 1;
        if (pillar) addColumn(x, y, 0, model.height);
        else {
          addColumn(x, y, model.height - 1.1, model.height);
          if (model.shape === "window") addColumn(x, y, 0, 0.65);
        }
        if (pillar || model.shape === "window") {
          const point = rotateModelPoint(
            model,
            { x: x + 0.5, y: y + 0.5, z: 0 },
            placement.rotation,
          );
          sockets.add(cellKey(placement.x + point.x, placement.y + point.y));
        }
      }
  } else {
    for (const cell of footprintCells(model, placement.rotation)) {
      if (
        model.shape !== "round" &&
        model.shape !== "cone" &&
        model.shape !== "bearing"
      )
        columns.push({
          x: placement.x + cell.x,
          y: placement.y + cell.y,
          width: 1,
          depth: 1,
          bottom: placement.z,
          top: placement.z + model.height,
        });
      // A tire or smooth shaft has no downward diamond-clasp socket.
      if (model.shape !== "wheel" && model.shape !== "axle")
        sockets.add(
          cellKey(placement.x + cell.x + 0.5, placement.y + cell.y + 0.5),
        );
    }
    // Curved parts occupy corner areas even when their cell centers lie outside
    // the ellipse. Reserve their bounding box conservatively for collisions.
    if (model.shape === "round" || model.shape === "cone")
      for (let y = 0; y < model.depth; y++)
        for (let x = 0; x < model.width; x++) addColumn(x, y, 0, model.height);
    // The bearing is a real frame, not an overlap exception: only its four
    // solid rails occupy volume. Its 1 × 1 tunnel stays open along local X.
    if (model.shape === "bearing") {
      addBox(0, 0, 2, 2, 0, 0.5);
      addBox(0, 0, 2, 2, 1.5, 2);
      addBox(0, 0, 2, 0.5, 0.5, 1.5);
      addBox(0, 1.5, 2, 0.5, 0.5, 1.5);
    }
  }
  if (model.shape === "wheel" || model.shape === "axle") {
    const start = rotateModelPoint(
      model,
      { x: 0, y: model.depth / 2, z: model.height / 2 },
      placement.rotation,
    );
    const end = rotateModelPoint(
      model,
      { x: model.width, y: model.depth / 2, z: model.height / 2 },
      placement.rotation,
    );
    const axis = start.x === end.x ? "y" : "x";
    const direction = Math.sign(end[axis] - start[axis]);
    const pointKey = (point: typeof start) =>
      `${placement.x + point.x},${placement.y + point.y},${placement.z + point.z}`;
    [start, end].forEach((point, index) =>
      mechanicalPorts.push({
        kind: model.shape === "wheel" ? "wheel" : "axle-end",
        point: pointKey(point),
        axis,
        direction: index === 0 ? -direction : direction,
      }),
    );
    if (model.shape === "axle")
      mechanicalPorts.push({
        kind: "axle-center",
        point: pointKey({
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2,
          z: model.height / 2,
        }),
        axis,
      });
  }
  if (model.shape === "bearing") {
    const center = rotateModelPoint(
      model,
      { x: model.width / 2, y: model.depth / 2, z: model.height / 2 },
      placement.rotation,
    );
    mechanicalPorts.push({
      kind: "bearing",
      point: `${placement.x + center.x},${placement.y + center.y},${placement.z + center.z}`,
      axis: placement.rotation === 90 || placement.rotation === 270 ? "y" : "x",
    });
  }
  return {
    placement,
    model,
    columns,
    sockets,
    mechanicalPorts,
    studs: new Set(
      studCenters(model, placement.rotation).map((point) =>
        cellKey(placement.x + point.x, placement.y + point.y),
      ),
    ),
  };
}

/**
 * Checks the clasp grid, occupied volumes and exact mechanical connections.
 * Slopes and round parts conservatively reserve their whole bounding box.
 * This is a connection check, not a load/stress simulation.
 */
export function validateAssembly(
  assembly: Pick<AssemblySpec, "placements">,
  models: readonly BrigoModel[] = MODELS,
  options: { checkInstructionOrder?: boolean } = {},
): AssemblyIssue[] {
  const issues: AssemblyIssue[] = [];
  const modelById = new Map(models.map((model) => [model.id, model]));
  const knownColors = new Set<string>(COLORS.map((color) => color.id));
  const keys = new Set<string>();
  const located: LocatedPart[] = [];
  for (const placement of assembly.placements) {
    if (keys.has(placement.key))
      issues.push({
        type: "duplicate-key",
        placementKey: placement.key,
        message: `Identifiant de placement répété : ${placement.key}.`,
      });
    keys.add(placement.key);
    const model = modelById.get(placement.modelId);
    if (!model) {
      issues.push({
        type: "unknown-model",
        placementKey: placement.key,
        message: `Modèle inconnu : ${placement.modelId}.`,
      });
      continue;
    }
    if (placement.colorId && !knownColors.has(placement.colorId))
      issues.push({
        type: "unknown-color",
        placementKey: placement.key,
        message: `Couleur inconnue : ${placement.colorId}.`,
      });
    if (
      !(["x", "y", "z"] as const).every((axis) => {
        const value = placement[axis];
        if (Number.isSafeInteger(value)) return true;
        if (model.shape !== "axle" || !Number.isSafeInteger(value * 2))
          return false;
        const shaftAxis =
          placement.rotation === 90 || placement.rotation === 270 ? "y" : "x";
        return axis !== shaftAxis;
      }) ||
      placement.z < 0 ||
      ![0, 90, 180, 270].includes(placement.rotation)
    ) {
      issues.push({
        type: "invalid-position",
        placementKey: placement.key,
        message: `Position ou orientation invalide : ${placement.key}.`,
      });
      continue;
    }
    located.push(locate(placement, model));
  }

  const links = located.map(() => new Set<number>());
  const mechanical = new Map<
    string,
    { index: number; port: MechanicalPort }[]
  >();
  for (const [index, part] of located.entries())
    for (const port of part.mechanicalPorts) {
      const key = `${port.axis}:${port.point}`;
      const candidates = mechanical.get(key) ?? [];
      for (const candidate of candidates) {
        const other = candidate.port;
        const wheelJoint =
          ((port.kind === "wheel" && other.kind === "axle-end") ||
            (port.kind === "axle-end" && other.kind === "wheel")) &&
          port.direction === -other.direction!;
        const bearingJoint =
          (port.kind === "bearing" && other.kind === "axle-center") ||
          (port.kind === "axle-center" && other.kind === "bearing");
        if (wheelJoint || bearingJoint) {
          links[index].add(candidate.index);
          links[candidate.index].add(index);
        }
      }
      candidates.push({ index, port });
      mechanical.set(key, candidates);
    }
  // Later vertical graph links may point upward to a piece already visited.
  // Only the side connections gathered above can provide lateral support.
  const mechanicalSupport = links.map((neighbors, index) => ({
    any: neighbors.size > 0,
    earlier: [...neighbors].some((neighbor) => neighbor < index),
  }));
  // Index only pieces sharing a cell or an attachment plane. Large models must
  // be checked as rigorously as small ones without comparing every volume pair.
  const volumes = new Map<string, (VolumeColumn & { index: number })[]>();
  const attachments = new Map<string, number[]>();
  for (const [index, part] of located.entries()) {
    for (const stud of part.studs) {
      const key = `${part.placement.z + part.model.height}:${stud}`;
      const indices = attachments.get(key) ?? [];
      indices.push(index);
      attachments.set(key, indices);
    }
  }
  const overlaps = new Set<string>();
  for (let first = 0; first < located.length; first++) {
    const part = located[first];
    let supported = part.placement.z === 0 || mechanicalSupport[first].any;
    let earlierSupport =
      part.placement.z === 0 || mechanicalSupport[first].earlier;
    for (const column of part.columns) {
      // A half-grid mechanism can cross several integer cells. The bucket is
      // only a broad phase; the complete XY and Z intervals decide collision.
      for (
        let y = Math.floor(column.y);
        y < Math.ceil(column.y + column.depth);
        y++
      )
        for (
          let x = Math.floor(column.x);
          x < Math.ceil(column.x + column.width);
          x++
        ) {
          const key = cellKey(x, y);
          const candidates = volumes.get(key) ?? [];
          for (const candidate of candidates) {
            const pair = `${candidate.index}:${first}`;
            if (candidate.index === first || overlaps.has(pair)) continue;
            if (
              column.x < candidate.x + candidate.width &&
              candidate.x < column.x + column.width &&
              column.y < candidate.y + candidate.depth &&
              candidate.y < column.y + column.depth &&
              column.bottom < candidate.top &&
              candidate.bottom < column.top
            ) {
              overlaps.add(pair);
              const other = located[candidate.index];
              issues.push({
                type: "overlap",
                placementKey: other.placement.key,
                otherKey: part.placement.key,
                message: `${other.placement.key} traverse ${part.placement.key}.`,
              });
            }
          }
          candidates.push({ ...column, index: first });
          volumes.set(key, candidates);
        }
    }
    for (const socket of part.sockets) {
      for (const second of attachments.get(`${part.placement.z}:${socket}`) ??
        []) {
        supported = true;
        if (second < first) earlierSupport = true;
        links[first].add(second);
        links[second].add(first);
      }
    }
    if (!supported)
      issues.push({
        type: "unsupported",
        placementKey: part.placement.key,
        message: `${part.placement.key} ne s’attache à aucun raccord compatible.`,
      });
    else if (options.checkInstructionOrder && !earlierSupport)
      issues.push({
        type: "instruction-order",
        placementKey: part.placement.key,
        message: `${part.placement.key} précède son support dans la notice.`,
      });
  }

  // Lateral links can form a closed component in mid-air. Such a component
  // still needs a path to a floor piece, just like a vertical stack does.
  const anchored = new Set<number>();
  const roots = located.flatMap((part, index) =>
    part.placement.z === 0 ? [index] : [],
  );
  roots.forEach((index) => anchored.add(index));
  while (roots.length)
    for (const next of links[roots.pop()!])
      if (!anchored.has(next)) {
        anchored.add(next);
        roots.push(next);
      }
  for (const [index, part] of located.entries())
    if (
      part.mechanicalPorts.length > 0 &&
      !anchored.has(index) &&
      !issues.some(
        (issue) =>
          issue.type === "unsupported" &&
          issue.placementKey === part.placement.key,
      )
    )
      issues.push({
        type: "unsupported",
        placementKey: part.placement.key,
        message: `${part.placement.key} appartient à un mécanisme sans appui au sol.`,
      });

  // Ground pieces also have to belong to the same attached construction.
  if (located.length > 1) {
    const visited = new Set<number>([0]);
    const queue = [0];
    while (queue.length)
      for (const next of links[queue.pop()!])
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
    for (let index = 0; index < located.length; index++)
      if (!visited.has(index))
        issues.push({
          type: "disconnected",
          placementKey: located[index].placement.key,
          message: `${located[index].placement.key} est séparée de l’assemblage principal.`,
        });
  }
  return issues;
}
