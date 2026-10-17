import { describe, expect, it } from "vitest";
import { BRIGO_BY_ID, CATALOG } from "../game/catalog";
import { footprintCells, rotatedSize } from "../game/geometry";
import type { Point3, Rotation } from "../game/geometry";
import { brigoGeometry } from "./BrigoScene";
import {
  BRIGO_MONOGRAM_PLACEMENTS,
  prepareBrigoMonogram,
} from "./brigoMonogram";

function paintedAt(x: number, y: number) {
  return prepareBrigoMonogram().paths.some((path) => {
    if (path.fill === "none" || !path.d.endsWith("Z")) return false;
    const vertices = [...path.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(
      (match) => [Number(match[1]), Number(match[2])],
    );
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  });
}

describe("the assembled Brigos monogram", () => {
  it("uses only existing catalogue pieces without overlapping or floating blocks", () => {
    const occupied = new Set<string>();
    const supportedCells = new Set<string>();
    for (const placement of BRIGO_MONOGRAM_PLACEMENTS) {
      const brigo = BRIGO_BY_ID.get(
        `${placement.modelId}:${placement.colorId}`,
      );
      expect(brigo, placement.key).toBeDefined();
      if (!brigo) continue;
      const cells = footprintCells(brigo.model, placement.rotation);
      if (placement.z > 0)
        expect(
          cells.some((cell) =>
            supportedCells.has(
              `${placement.x + cell.x},${placement.y + cell.y},${placement.z}`,
            ),
          ),
          `${placement.key} needs a real support`,
        ).toBe(true);
      for (const cell of cells) {
        const x = placement.x + cell.x,
          y = placement.y + cell.y;
        for (let z = placement.z; z < placement.z + brigo.model.height; z++) {
          const key = `${x},${y},${z}`;
          expect(occupied.has(key), `piece collision at ${key}`).toBe(false);
          occupied.add(key);
        }
        supportedCells.add(`${x},${y},${placement.z + brigo.model.height}`);
      }
      expect(rotatedSize(brigo.model, placement.rotation).depth).toBe(1);
    }
  });

  it("keeps both B counters open through its projected thickness", () => {
    for (const x of [32, 36, 40])
      for (const y of [-114, -110, -106])
        expect(paintedAt(x, y), `upper counter at ${x},${y}`).toBe(false);
    for (const x of [32, 36, 40])
      for (const y of [-50, -46, -42])
        expect(paintedAt(x, y), `lower counter at ${x},${y}`).toBe(false);
    expect(paintedAt(10, -110)).toBe(true);
    expect(paintedAt(85, -110)).toBe(true);
    expect(paintedAt(37.5, -70)).toBe(true);
    expect(paintedAt(110, -26)).toBe(true);
    // The right edge returns inward at the waist, separating both bowls.
    expect(paintedAt(100, -70)).toBe(false);
  });

  it("preserves the workshop projection exactly when no logo camera is requested", () => {
    const originalProjection = ({ x, y, z }: Point3): [number, number] => [
      (x - y) * 25,
      (x + y) * 12.5 - z * 7,
    ];
    for (const brigo of CATALOG.filter((piece) => piece.color.id === "coral"))
      for (const rotation of [0, 90, 180, 270] as Rotation[])
        expect(brigoGeometry(brigo, rotation)).toEqual(
          brigoGeometry(brigo, rotation, originalProjection),
        );
  });

  it("prepares a deterministic, compact, finite drawing for every static asset", () => {
    const scene = prepareBrigoMonogram();
    expect(scene).toEqual(prepareBrigoMonogram());
    expect(scene.pieceCount).toBe(BRIGO_MONOGRAM_PLACEMENTS.length);
    expect(scene.paths.length).toBeLessThan(220);
    expect(
      scene.paths.filter((path) => path.role === "stud").length,
    ).toBeGreaterThan(0);
    expect(scene.width / scene.height).toBeGreaterThan(0.6);
    expect(scene.width / scene.height).toBeLessThan(0.85);
    expect(JSON.stringify(scene)).not.toMatch(
      /NaN|Infinity|undefined|<script|https?:/,
    );
  });
});
