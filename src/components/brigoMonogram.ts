import { BRIGO_BY_ID } from "../game/catalog";
import type { AssemblyPlacement } from "../game/assemblies";
import {
  footprintCells,
  prepareSceneOrder,
  rotatedSize,
} from "../game/geometry";
import type { Point3 } from "../game/geometry";
import { brigoGeometry } from "./BrigoScene";

/**
 * An original, freestanding letter assembled on the same grid as the workshop.
 * This is artwork only: it does not add a recipe or touch a player's inventory.
 * Two open counters and a sloped upper shoulder form a B.
 */
export const BRIGO_MONOGRAM_PLACEMENTS: readonly AssemblyPlacement[] = [
  {
    key: "foot",
    modelId: "brick-1x3",
    colorId: "coral",
    x: 0,
    y: 0,
    z: 0,
    rotation: 90,
  },
  {
    key: "foot-bowl",
    modelId: "brick-1x2",
    colorId: "coral",
    x: 3,
    y: 0,
    z: 0,
    rotation: 90,
  },
  {
    key: "stem-low",
    modelId: "brick-1x1",
    colorId: "coral",
    x: 0,
    y: 0,
    z: 3,
    rotation: 0,
  },
  {
    key: "bowl-low",
    modelId: "brick-1x1",
    colorId: "orange",
    x: 4,
    y: 0,
    z: 3,
    rotation: 0,
  },
  {
    key: "stem-middle",
    modelId: "brick-1x1",
    colorId: "coral",
    x: 0,
    y: 0,
    z: 6,
    rotation: 0,
  },
  {
    key: "bowl-middle",
    modelId: "brick-1x3",
    colorId: "orange",
    x: 2,
    y: 0,
    z: 6,
    rotation: 90,
  },
  {
    key: "waist",
    modelId: "brick-1x3",
    colorId: "coral",
    x: 0,
    y: 0,
    z: 9,
    rotation: 90,
  },
  {
    key: "stem-high",
    modelId: "brick-1x1",
    colorId: "coral",
    x: 0,
    y: 0,
    z: 12,
    rotation: 0,
  },
  {
    key: "bowl-high",
    modelId: "brick-1x2",
    colorId: "orange",
    x: 2,
    y: 0,
    z: 12,
    rotation: 90,
  },
  {
    key: "stem-crown",
    modelId: "brick-1x1",
    colorId: "coral",
    x: 0,
    y: 0,
    z: 15,
    rotation: 0,
  },
  {
    key: "bowl-crown",
    modelId: "brick-1x1",
    colorId: "orange",
    x: 3,
    y: 0,
    z: 15,
    rotation: 0,
  },
  {
    key: "crown",
    modelId: "brick-1x3",
    colorId: "yellow",
    x: 0,
    y: 0,
    z: 18,
    rotation: 90,
  },
  {
    key: "shoulder",
    modelId: "slope-1x1",
    colorId: "orange",
    x: 3,
    y: 0,
    z: 18,
    rotation: 0,
  },
];

export type MonogramPath = {
  d: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  role: "body" | "detail" | "stud" | "hatching" | "brush" | "highlight";
};

const INK = "#252127";
const HIGHLIGHT = "#fff5d9";
// A more frontal drawing preserves the two small counters at favicon sizes.
// Only the camera changes: the catalogue shapes and their dimensions do not.
const monogramProjection = ({ x, y, z }: Point3): [number, number] => [
  x * 25 - y * 8,
  x * 12.5 + y * 4 - z * 7,
];
const socketKey = (x: number, y: number, z: number) =>
  `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;

/**
 * Build-time preparation only. The app imports the resulting small JSON, never
 * this module or the workshop renderer. Every face and diamond connector comes
 * from the existing Brigos geometry, including its manga ink and bevels.
 */
export function prepareBrigoMonogram() {
  const layers = BRIGO_MONOGRAM_PLACEMENTS.map((placement) => {
    const brigo = BRIGO_BY_ID.get(`${placement.modelId}:${placement.colorId}`);
    if (!brigo) throw new Error(`Unknown monogram piece: ${placement.key}`);
    const size = rotatedSize(brigo.model, placement.rotation);
    const mesh = brigoGeometry(brigo, placement.rotation, monogramProjection);
    const offset = monogramProjection(placement);
    return {
      placement,
      brigo,
      primitives: mesh.primitives,
      offset,
      worldBounds: {
        minX: placement.x,
        maxX: placement.x + size.width,
        minY: placement.y,
        maxY: placement.y + size.depth,
        minZ: placement.z,
        maxZ: placement.z + brigo.model.height,
      },
      projectedBounds: {
        minX: mesh.minX + 9 + offset[0],
        maxX: mesh.minX + mesh.width - 9 + offset[0],
        minY: mesh.minY + 9 + offset[1],
        maxY: mesh.minY + mesh.height - 9 + offset[1],
      },
    };
  });
  const coveredSockets = new Set<string>();
  for (const { placement, brigo } of layers)
    for (const cell of footprintCells(brigo.model, placement.rotation))
      coveredSockets.add(
        socketKey(
          placement.x + cell.x + 0.5,
          placement.y + cell.y + 0.5,
          placement.z,
        ),
      );

  const paths: MonogramPath[] = [];
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const layer of prepareSceneOrder(layers).sortVisible()) {
    const { offset, placement } = layer;
    // Keep the face upright while retaining the shallow right-hand thickness.
    // The original projection and its exact piece proportions remain shared.
    const project = (x: number, y: number): [number, number] => [
      x + offset[0],
      y + offset[1] - (x + offset[0]) * 0.5,
    ];
    const transformPath = (d: string) =>
      d.replace(
        /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
        (_match, command: string, x: string, y: string) => {
          const transformed = project(Number(x), Number(y));
          return `${command}${transformed[0].toFixed(2)} ${transformed[1].toFixed(2)}`;
        },
      );
    for (const primitive of layer.primitives) {
      const socket = primitive.studCenter;
      if (
        socket &&
        coveredSockets.has(
          socketKey(
            socket.x + placement.x,
            socket.y + placement.y,
            socket.z + placement.z,
          ),
        )
      )
        continue;
      for (const [x, y] of primitive.points) {
        const [px, py] = project(x, y);
        bounds.minX = Math.min(bounds.minX, px);
        bounds.maxX = Math.max(bounds.maxX, px);
        bounds.minY = Math.min(bounds.minY, py);
        bounds.maxY = Math.max(bounds.maxY, py);
      }
      paths.push({
        d: transformPath(primitive.d),
        fill: primitive.fill,
        stroke: primitive.stroke,
        strokeWidth: primitive.strokeWidth,
        opacity: primitive.opacity,
        role: primitive.surface,
      });
      if (primitive.hatching)
        paths.push({
          d: transformPath(primitive.hatching),
          fill: "none",
          stroke: INK,
          strokeWidth: 0.7,
          opacity: 0.43,
          role: "hatching",
        });
      if (primitive.brush)
        paths.push({
          d: transformPath(primitive.brush),
          fill: INK,
          opacity: 0.85,
          role: "brush",
        });
      if (primitive.highlight)
        paths.push({
          d: transformPath(primitive.highlight),
          fill: "none",
          stroke: HIGHLIGHT,
          strokeWidth: 0.9,
          opacity: 0.82,
          role: "highlight",
        });
    }
  }
  const padding = 3;
  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;
  return {
    viewBox: `${minX} ${minY} ${width} ${height}`,
    width,
    height,
    pieceCount: layers.length,
    paths,
  };
}
