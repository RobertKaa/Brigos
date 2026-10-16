import { describe, expect, it } from "vitest";
import { prepareConstructionScene } from "./BrigoScene";
import type { Rotation } from "../game/geometry";

type Point = [number, number];

// Inspect the last filled polygon covering a projected point, independently of
// the sorting graph. The sample lies in a real, camera-facing wall surface.
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

function projectHouse(
  x: number,
  y: number,
  z: number,
  rotation: Rotation,
): Point {
  // This published construction has a six-unit square base. Keep the oracle
  // separate from the production rotateModelPoint and projection helpers.
  const [rx, ry] =
    rotation === 90
      ? [6 - y, x]
      : rotation === 180
        ? [6 - x, 6 - y]
        : rotation === 270
          ? [y, 6 - x]
          : [x, y];
  return [(rx - ry) * 25, (rx + ry) * 12.5 - z * 7];
}

function lastPaintedPiece(
  scene: NonNullable<ReturnType<typeof prepareConstructionScene>>,
  sample: Point,
) {
  let key: string | undefined;
  for (const layer of scene.frame().orderedLayers)
    for (const primitive of layer.primitives)
      if (
        primitive.fill !== "none" &&
        covers(primitive.points, [
          sample[0] - layer.offset[0],
          sample[1] - layer.offset[1],
        ])
      )
        key = layer.placement.key;
  return key;
}

describe("occlusion entre les pièces d’une construction", () => {
  it.each([
    {
      recipeId: "waterlily-fountain",
      rotation: 0,
      sample: [-182.64, 74.73],
      expected: "piece-042",
    },
    {
      recipeId: "waterlily-fountain",
      rotation: 90,
      sample: [-219.67, 130.46],
      expected: "piece-070",
    },
    {
      recipeId: "travellers-station",
      rotation: 90,
      sample: [-119.67, 289.17],
      expected: "piece-102",
    },
    {
      recipeId: "travellers-station",
      rotation: 180,
      sample: [119.82, 289.17],
      expected: "piece-102",
    },
    {
      recipeId: "cape-fort",
      rotation: 0,
      sample: [19.82, 48.17],
      expected: "piece-097",
    },
    {
      recipeId: "high-citadel",
      rotation: 90,
      sample: [1477.44, 969.62],
      expected: "piece-485",
    },
  ] as const)(
    "les supports hors champ ne perturbent pas $recipeId à $rotation°",
    ({ recipeId, rotation, sample, expected }) => {
      const scene = prepareConstructionScene({ recipeId, rotation })!;
      expect(lastPaintedPiece(scene, [...sample])).toBe(expected);
    },
  );

  it.each([0, 270] as const)(
    "la porte ne déborde pas sur le mur adjacent de la maison à %s°",
    (rotation) => {
      const scene = prepareConstructionScene({ recipeId: "house", rotation })!;
      for (const bottom of [1, 4, 7]) {
        const wall = scene.layers.find(
          (layer) =>
            layer.placement.modelId === "brick-1x4" &&
            layer.placement.z === bottom,
        )!;
        for (const x of [4.2, 4.35, 4.6, 4.8]) {
          for (const height of [0.5, 1, 1.5, 2, 2.5]) {
            const sample = projectHouse(x, 5, bottom + height, rotation);
            expect(
              lastPaintedPiece(scene, sample),
              `${rotation}° mur à (${x}, 5, ${bottom + height})`,
            ).toBe(wall.placement.key);
          }
        }
      }
    },
  );
});
