import { Fragment, memo, useId, useMemo } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { BRIGO_BY_ID } from "../game/catalog";
import {
  prepareSceneOrder,
  rotateModelPoint,
  rotatedSize,
} from "../game/geometry";
import type { Point3, Rotation } from "../game/geometry";
import { SANDBOX_GRID_SIZE, SANDBOX_MAX_HEIGHT } from "../game/sandbox";
import type { SandboxPlacement } from "../game/sandbox";
import { brigoGeometry } from "./BrigoScene";
import { createConstructionCache } from "./constructionCache";
import "./SandboxScene.css";

export interface SandboxCursor {
  x: number;
  y: number;
  z: number;
}

export interface SandboxSceneProps {
  placements: readonly SandboxPlacement[];
  selectedId: string | null;
  cursor: SandboxCursor;
  candidate?: Omit<SandboxPlacement, "id"> | null;
  candidateValid?: boolean;
  onCell: (x: number, y: number) => void;
  onSelect: (id: string) => void;
  onPlace?: () => void;
  onCursorMove?: (cursor: SandboxCursor) => void;
  interactionMode?: "place" | "select";
  stackAutomatically?: boolean;
  /** Automatic stacking picks the ground; manual edits pick their active plane. */
  pickHeight?: number;
  cameraRotation?: Rotation;
  className?: string;
}

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

/** Pick the active horizontal plane, including after a camera quarter-turn. */
function sandboxPointAtHeight(
  screen: { x: number; y: number },
  z: number,
  rotation: Rotation = 0,
): Point3 | null {
  if (![screen.x, screen.y, z, rotation].every(Number.isFinite)) return null;
  const sum = (screen.y + z * 7) / 12.5;
  const difference = screen.x / 25;
  const cameraPoint = {
    x: (sum + difference) / 2,
    y: (sum - difference) / 2,
    z,
  };
  const world = rotateModelPoint(
    boardSize,
    cameraPoint,
    ((360 - rotation) % 360) as Rotation,
  );
  return [world.x, world.y, world.z].every(Number.isFinite) ? world : null;
}

/** Pick the active horizontal plane, including after a camera quarter-turn. */
export function sandboxCellAtPoint(
  screen: { x: number; y: number },
  z: number,
  rotation: Rotation = 0,
): { x: number; y: number } | null {
  const world = sandboxPointAtHeight(screen, z, rotation);
  if (
    !world ||
    world.x < 0 ||
    world.x >= SANDBOX_GRID_SIZE ||
    world.y < 0 ||
    world.y >= SANDBOX_GRID_SIZE
  )
    return null;
  return { x: Math.floor(world.x), y: Math.floor(world.y) };
}

/** A piece intercepts its visible faces; aim at its top instead of the ground. */
export function sandboxCellOnPlacementAtPoint(
  screen: { x: number; y: number },
  placement: SandboxPlacement,
  cameraRotation: Rotation = 0,
): { x: number; y: number } | null {
  const brigo = BRIGO_BY_ID.get(placement.brigoId);
  if (
    !brigo ||
    ![placement.x, placement.y, placement.z, placement.rotation].every(
      Number.isFinite,
    )
  )
    return null;
  const world = sandboxPointAtHeight(
    screen,
    placement.z + brigo.model.height,
    cameraRotation,
  );
  if (!world) return null;
  const size = rotatedSize(brigo.model, placement.rotation);
  // Clicks on a side project beyond the top face. Keep them on this piece.
  return {
    x: Math.max(
      placement.x,
      Math.min(placement.x + size.width - 1, Math.floor(world.x)),
    ),
    y: Math.max(
      placement.y,
      Math.min(placement.y + size.depth - 1, Math.floor(world.y)),
    ),
  };
}

function pointInSvg(event: MouseEvent<SVGElement>, svg: SVGSVGElement) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const client = svg.createSVGPoint();
  client.x = event.clientX;
  client.y = event.clientY;
  return client.matrixTransform(matrix.inverse());
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

function outline(
  position: SandboxCursor,
  width: number,
  depth: number,
  height: number,
  cameraRotation: Rotation,
) {
  const footprint = [
    { x: position.x, y: position.y, z: position.z },
    { x: position.x + width, y: position.y, z: position.z },
    { x: position.x + width, y: position.y + depth, z: position.z },
    { x: position.x, y: position.y + depth, z: position.z },
  ];
  const line = (points: Point3[], closed = false) =>
    points
      .map((p, index) => {
        const projected = projectSandboxPoint(p, cameraRotation);
        return `${index ? "L" : "M"}${projected.x} ${projected.y}`;
      })
      .join(" ") + (closed ? "Z" : "");
  return (
    line(footprint, true) +
    (height
      ? ` ${line(
          footprint.map((p) => ({ ...p, z: p.z + height })),
          true,
        )} ${footprint
          .map((p) => line([p, { ...p, z: p.z + height }]))
          .join(" ")}`
      : "")
  );
}

export const SandboxScene = memo(function SandboxScene({
  placements,
  selectedId,
  cursor,
  candidate,
  candidateValid = false,
  onCell,
  onSelect,
  onPlace,
  onCursorMove,
  interactionMode = "place",
  stackAutomatically = true,
  pickHeight = cursor.z,
  cameraRotation = 0,
  className = "",
}: SandboxSceneProps) {
  const instance = useId().replace(/:/g, "");
  const instructionsId = `${instance}-instructions`;
  const layers = useMemo(
    () => prepareSandboxDrawing(placements, cameraRotation),
    [placements, cameraRotation],
  );
  const candidateLayers = useMemo(
    () =>
      candidate
        ? prepareSandboxDrawing([{ ...candidate, id: "ghost" }], cameraRotation)
        : [],
    [candidate, cameraRotation],
  );
  const ghost = candidateLayers[0];
  const symbols = new Map(
    [...layers, ...candidateLayers].map((layer) => [layer.key, layer]),
  );
  const symbolId = (key: string) =>
    `${instance}-mesh-${[...symbols.keys()].indexOf(key)}`;
  const height = Math.min(
    SANDBOX_MAX_HEIGHT,
    Math.max(
      6,
      cursor.z + (ghost?.brigo.model.height ?? 0),
      ...layers.map((layer) => layer.worldBounds.maxZ),
    ),
  );
  const top = Math.ceil(height * 7 + 42);
  const grid = useMemo(
    () =>
      Array.from({ length: SANDBOX_GRID_SIZE + 1 }, (_, value) =>
        [
          [
            { x: value, y: 0, z: 0 },
            { x: value, y: SANDBOX_GRID_SIZE, z: 0 },
          ],
          [
            { x: 0, y: value, z: 0 },
            { x: SANDBOX_GRID_SIZE, y: value, z: 0 },
          ],
        ]
          .map((line) =>
            line
              .map((p, index) => {
                const projected = projectSandboxPoint(p, cameraRotation);
                return `${index ? "L" : "M"}${projected.x} ${projected.y}`;
              })
              .join(" "),
          )
          .join(" "),
      ).join(" "),
    [cameraRotation],
  );
  const moveCursor = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const delta = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (delta) {
      event.preventDefault();
      const next = {
        ...cursor,
        x: Math.max(0, Math.min(SANDBOX_GRID_SIZE - 1, cursor.x + delta[0])),
        y: Math.max(0, Math.min(SANDBOX_GRID_SIZE - 1, cursor.y + delta[1])),
      };
      if (onCursorMove) onCursorMove(next);
      else onCell(next.x, next.y);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (candidateValid) onPlace?.();
    }
  };
  const pickCell = (event: MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const point = pointInSvg(event, svg);
    if (!point) return;
    const cell = sandboxCellAtPoint(point, pickHeight, cameraRotation);
    if (cell) onCell(cell.x, cell.y);
    svg.parentElement?.focus({ preventScroll: true });
  };
  const selected = layers.find((layer) => layer.placement.id === selectedId);

  return (
    <div
      className={`sandbox-scene ${className}`}
      tabIndex={0}
      role="group"
      aria-label="Plateau de construction libre"
      aria-describedby={instructionsId}
      onKeyDown={moveCursor}
      data-camera-rotation={cameraRotation}
      data-placements={layers.length}
      data-interaction-mode={interactionMode}
    >
      <p id={instructionsId} className="sandbox-scene-instructions">
        {interactionMode === "place"
          ? `Touchez le plateau ou une pièce posée pour positionner le curseur${stackAutomatically ? " au-dessus" : " sur le plan actif"}, puis utilisez Placer. Au clavier, les flèches déplacent le curseur et Entrée place la pièce.`
          : "Touchez une pièce posée pour la sélectionner et la modifier. Au clavier, les flèches déplacent le curseur et Entrée confirme la modification."}
      </p>
      <svg
        viewBox={`-650 -${top} 1300 ${650 + top}`}
        aria-label={`Plateau de ${SANDBOX_GRID_SIZE} par ${SANDBOX_GRID_SIZE}, ${layers.length} Brigos posés. Curseur X ${cursor.x + 1}, Y ${cursor.y + 1}, hauteur ${cursor.z}.`}
        role="img"
        onClick={pickCell}
        data-art-style="ink"
        data-connector-style="diamond"
      >
        <defs>
          {[...symbols.values()].map((layer) => (
            <g
              key={layer.key}
              id={symbolId(layer.key)}
              strokeWidth="1.1"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {layer.mesh.primitives.map((primitive, index) => (
                <Fragment key={index}>
                  <path
                    d={primitive.d}
                    fill={primitive.fill}
                    stroke={primitive.stroke}
                    opacity={primitive.opacity}
                  />
                  {primitive.hatching && (
                    <path
                      d={primitive.hatching}
                      fill="none"
                      stroke="#293146"
                      strokeWidth=".6"
                      opacity=".32"
                    />
                  )}
                </Fragment>
              ))}
            </g>
          ))}
        </defs>
        <path
          className="sandbox-board-surface"
          d={outline(
            { x: 0, y: 0, z: 0 },
            SANDBOX_GRID_SIZE,
            SANDBOX_GRID_SIZE,
            0,
            cameraRotation,
          )}
        />
        <path className="sandbox-board-grid" d={grid} />
        {pickHeight > 0 && (
          <g className="sandbox-elevation-plane" pointerEvents="none">
            <path
              d={outline(
                { x: 0, y: 0, z: pickHeight },
                SANDBOX_GRID_SIZE,
                SANDBOX_GRID_SIZE,
                0,
                cameraRotation,
              )}
            />
            <path d={grid} transform={`translate(0 ${-pickHeight * 7})`} />
          </g>
        )}
        <g className="sandbox-board-coordinates" aria-hidden="true">
          {[1, 5, 9, 13, 17, 21, 24].flatMap((value) =>
            ["x", "y"].map((axis) => {
              const p = projectSandboxPoint(
                {
                  x: axis === "x" ? value - 0.5 : 25.1,
                  y: axis === "y" ? value - 0.5 : 25.1,
                  z: 0,
                },
                cameraRotation,
              );
              return (
                <text key={`${axis}-${value}`} x={p.x} y={p.y + 7}>
                  {axis.toUpperCase()} {value}
                </text>
              );
            }),
          )}
        </g>
        <path
          className="sandbox-cursor-ground"
          d={outline({ ...cursor, z: 0 }, 1, 1, 0, cameraRotation)}
          pointerEvents="none"
        />
        {layers.map((layer) => (
          <g
            key={layer.placement.id}
            className={`sandbox-placed-brigo ${layer.placement.id === selectedId ? "is-selected" : ""}`}
            data-placement-id={layer.placement.id}
            onClick={(event) => {
              event.stopPropagation();
              const svg = event.currentTarget.ownerSVGElement;
              if (interactionMode === "select") {
                onSelect(layer.placement.id);
              } else if (svg) {
                const point = pointInSvg(event, svg);
                const cell =
                  point &&
                  (stackAutomatically
                    ? sandboxCellOnPlacementAtPoint(
                        point,
                        layer.placement,
                        cameraRotation,
                      )
                    : sandboxCellAtPoint(point, pickHeight, cameraRotation));
                if (cell) onCell(cell.x, cell.y);
              }
              svg?.parentElement?.focus({ preventScroll: true });
            }}
          >
            <title>
              {layer.brigo.name} · X {layer.placement.x + 1}, Y{" "}
              {layer.placement.y + 1}, hauteur {layer.placement.z}
            </title>
            <use
              href={`#${symbolId(layer.key)}`}
              transform={`translate(${layer.offset.x} ${layer.offset.y})`}
            />
          </g>
        ))}
        {selected && (
          <path
            className="sandbox-selection-outline"
            pointerEvents="none"
            d={outline(
              selected.placement,
              rotatedSize(selected.brigo.model, selected.placement.rotation)
                .width,
              rotatedSize(selected.brigo.model, selected.placement.rotation)
                .depth,
              selected.brigo.model.height,
              cameraRotation,
            )}
          />
        )}
        {ghost && (
          <g
            className="sandbox-candidate"
            data-valid={candidateValid}
            pointerEvents="none"
          >
            <use
              href={`#${symbolId(ghost.key)}`}
              transform={`translate(${ghost.offset.x} ${ghost.offset.y})`}
            />
            <path
              className="sandbox-candidate-outline"
              d={outline(
                ghost.placement,
                rotatedSize(ghost.brigo.model, ghost.placement.rotation).width,
                rotatedSize(ghost.brigo.model, ghost.placement.rotation).depth,
                ghost.brigo.model.height,
                cameraRotation,
              )}
            />
          </g>
        )}
        {!ghost && (
          <path
            className="sandbox-cursor-plane"
            d={outline(cursor, 1, 1, 0, cameraRotation)}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
});
