import { describe, expect, it } from "vitest";
import { BRIGO_BY_ID, MODELS } from "../game/catalog";
import type { Rotation } from "../game/geometry";
import { brigoGeometry } from "./BrigoScene";

type Point = [number, number];

// Independent coverage oracle: sample the actual SVG painter order, rather
// than the renderer's classification or the center of a decorative path.
function covers(polygon: Point[], [x, y]: Point) {
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

function projected(
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  rotation: Rotation,
): Point {
  // Do not reuse rotateModelPoint or a renderer projection in this oracle.
  const [rx, ry] =
    rotation === 90
      ? [depth - y, x]
      : rotation === 180
        ? [width - x, depth - y]
        : rotation === 270
          ? [y, width - x]
          : [x, y];
  return [(rx - ry) * 25, (rx + ry) * 12.5 - z * 7];
}

function shiftedColor(hex: string, offset: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((index) =>
        Math.max(
          0,
          Math.min(255, parseInt(hex.slice(index, index + 2), 16) + offset),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

describe("ouvertures et vantaux des pièces spéciales", () => {
  it.each([0, 90, 180, 270] as const)(
    "les joues intérieures respectent la profondeur du vantail à %s°",
    (rotation) => {
      const brigo = BRIGO_BY_ID.get("special-door:ivory")!;
      const primitives = brigoGeometry(brigo, rotation).primitives;
      const towardPositiveX = rotation === 0 || rotation === 90;
      const towardPositiveY = rotation === 0 || rotation === 270;
      const y = towardPositiveY ? 0.58 : 2.42;
      for (const front of [false, true]) {
        const x = front === towardPositiveX ? 0.8 : 0.2;
        const sample = projected(x, y, 3, 1, 3, rotation);
        const painted = primitives
          .filter((p) => p.fill !== "none" && covers(p.points, sample))
          .at(-1);
        const expected = shiftedColor(
          brigo.color.hex,
          front ? (rotation === 0 || rotation === 180 ? -17 : -48) : -8,
        );
        expect(
          painted?.fill,
          `${rotation}° joue ${front ? "avant" : "arrière"}, ` +
            `peinture finale ${painted?.fill} à ${sample.join(",")}`,
        ).toBe(expected);
      }
    },
  );
  it.each([0, 90, 180, 270] as const)(
    "les arches gardent une véritable ouverture traversante à %s°",
    (rotation) => {
      for (const model of MODELS.filter(
        (candidate) => candidate.shape === "arch",
      )) {
        const primitives = brigoGeometry(
          BRIGO_BY_ID.get(`${model.id}:ivory`)!,
          rotation,
        ).primitives;
        // Both ends of these camera rays stay under the curved lintel and
        // between the pillars, including the two-unit-deep arch.
        for (const z of [0.1, 0.4]) {
          const sample = projected(
            model.width / 2,
            model.depth / 2,
            z,
            model.width,
            model.depth,
            rotation,
          );
          expect(
            primitives.filter(
              (p) => p.fill !== "none" && covers(p.points, sample),
            ),
            `${model.id} ${rotation}° à z=${z}`,
          ).toEqual([]);
        }
      }
    },
  );
  it.each([0, 90, 180, 270] as const)(
    "le vitrage et les croisillons restent derrière le cadre à %s°",
    (rotation) => {
      for (const color of ["ivory", "charcoal"]) {
        const brigo = BRIGO_BY_ID.get(`special-window:${color}`)!;
        const primitives = brigoGeometry(brigo, rotation).primitives;
        const frontX = rotation === 0 || rotation === 90 ? 1 : 0;
        const expected = shiftedColor(
          brigo.color.hex,
          rotation === 0 || rotation === 180 ? -48 : -17,
        );
        for (const y of [0.1, 0.3, 1.6, 1.9]) {
          for (const z of [0.8, 2, 3, 4.3]) {
            const sample = projected(frontX, y, z, 1, 2, rotation);
            const painted = primitives
              .filter((p) => p.fill !== "none" && covers(p.points, sample))
              .at(-1);
            expect(
              painted?.fill,
              `${color} ${rotation}° cadre fenêtre (${y},${z}), ` +
                `peinture finale ${painted?.fill} à ${sample.join(",")}`,
            ).toBe(expected);
            expect(painted?.opacity ?? 1).toBe(1);
          }
        }
      }
    },
  );
  it.each([0, 90, 180, 270] as const)(
    "le cadre avant masque les motifs reculés du vantail à %s°",
    (rotation) => {
      for (const color of ["ivory", "charcoal"]) {
        const brigo = BRIGO_BY_ID.get(`special-door:${color}`)!;
        const primitives = brigoGeometry(brigo, rotation).primitives;
        const frontX = rotation === 0 || rotation === 90 ? 1 : 0;
        const expected = shiftedColor(
          brigo.color.hex,
          rotation === 0 || rotation === 180 ? -48 : -17,
        );
        for (const y of [0.15, 0.4, 2.5, 2.75, 2.9]) {
          for (const z of [0.4, 1.1, 2.4, 3.8, 5.1, 6.3, 7.6]) {
            const sample = projected(frontX, y, z, 1, 3, rotation);
            const painted = primitives
              .filter((p) => p.fill !== "none" && covers(p.points, sample))
              .at(-1);
            expect(
              painted?.fill,
              `${color} ${rotation}° cadre (${y},${z}), ` +
                `peinture finale ${painted?.fill} à ${sample.join(",")}`,
            ).toBe(expected);
          }
        }
      }
    },
  );
  it.each([0, 90, 180, 270] as const)(
    "le vantail reste opaque au-delà de ses seuls motifs à %s°",
    (rotation) => {
      for (const color of ["ivory", "charcoal"]) {
        const brigo = BRIGO_BY_ID.get(`special-door:${color}`)!;
        const primitives = brigoGeometry(brigo, rotation).primitives;
        const frontX = rotation === 0 || rotation === 90 ? 0.59 : 0.41;
        const panelColors = [
          shiftedColor(brigo.color.hex, -8),
          shiftedColor(brigo.color.hex, -14),
          "#f5ca62",
        ];
        // Rays in the viewer direction (±1, ±1, 25/7) reach the outside of
        // the one-unit frame before either jamb or the lintel at these points.
        // This samples plain panel, both recessed motifs, and their margins.
        for (const y of [1.1, 1.5, 1.9]) {
          for (const z of [0.4, 1.1, 2.4, 3.8, 5.1, 6.3]) {
            const sample = projected(frontX, y, z, 1, 3, rotation);
            const painted = primitives
              .filter((p) => p.fill !== "none" && covers(p.points, sample))
              .at(-1);
            expect(
              painted,
              `${color} ${rotation}° panneau (${y},${z})`,
            ).toBeDefined();
            expect(painted?.opacity ?? 1).toBe(1);
            expect(
              panelColors,
              `${color} ${rotation}° panneau (${y},${z}), ` +
                `peinture finale ${painted?.fill} à ${sample.join(",")}`,
            ).toContain(painted?.fill);
          }
        }
      }
    },
  );
});
