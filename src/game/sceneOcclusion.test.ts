import { describe, expect, it } from "vitest";
import { prepareSceneOrder } from "./geometry";
import type { Bounds3, Rotation, ScenePartBounds } from "./geometry";

interface Part extends ScenePartBounds {
  key: string;
}

function part(key: string, box: Bounds3, rotation: Rotation = 0): Part {
  const corners = [box.minX, box.maxX].flatMap((x) =>
    [box.minY, box.maxY].flatMap((y) =>
      [box.minZ, box.maxZ].map((z) => {
        const [rx, ry] =
          rotation === 90
            ? [6 - y, x]
            : rotation === 180
              ? [6 - x, 6 - y]
              : rotation === 270
                ? [y, 6 - x]
                : [x, y];
        return { x: rx, y: ry, z };
      }),
    ),
  );
  const projected = corners.map(({ x, y, z }) => ({
    x: (x - y) * 25,
    y: (x + y) * 12.5 - z * 7,
  }));
  return {
    key,
    worldBounds: {
      minX: Math.min(...corners.map((p) => p.x)),
      maxX: Math.max(...corners.map((p) => p.x)),
      minY: Math.min(...corners.map((p) => p.y)),
      maxY: Math.max(...corners.map((p) => p.y)),
      minZ: box.minZ,
      maxZ: box.maxZ,
    },
    projectedBounds: {
      minX: Math.min(...projected.map((p) => p.x)),
      maxX: Math.max(...projected.map((p) => p.x)),
      minY: Math.min(...projected.map((p) => p.y)),
      maxY: Math.max(...projected.map((p) => p.y)),
    },
  };
}

const door: Bounds3 = {
  minX: 1,
  maxX: 4,
  minY: 4,
  maxY: 5,
  minZ: 1,
  maxZ: 10,
};
const sideWall: Bounds3 = {
  minX: 4,
  maxX: 5,
  minY: 1,
  maxY: 5,
  minZ: 1,
  maxZ: 4,
};
const backWall: Bounds3 = {
  minX: 1,
  maxX: 4,
  minY: 1,
  maxY: 2,
  minZ: 4,
  maxZ: 7,
};

describe("occlusion entre volumes voisins", () => {
  it("un support hors de la silhouette ne casse pas l’ordre d’un voisinage indépendant", () => {
    // Real fountain bounds: the concave cap shares a world footprint with an
    // offset rounded support, but their projected silhouettes do not touch.
    const cap: Part = {
      ...part("cap", {
        minX: 2,
        maxX: 5,
        minY: 2,
        maxY: 5,
        minZ: 6,
        maxZ: 7,
      }),
      projectedBounds: { minX: -45.5, maxX: 45.5, minY: 15.75, maxY: 68.25 },
    };
    const support: Part = {
      ...part("support", {
        minX: 4,
        maxX: 8,
        minY: 4,
        maxY: 8,
        minZ: 3,
        maxZ: 6,
      }),
      projectedBounds: { minX: -68.3, maxX: 68.3, minY: 73.85, maxY: 163.15 },
    };
    const frontTile: Part = {
      ...part("front-tile", {
        minX: 1,
        maxX: 2,
        minY: 6,
        maxY: 10,
        minZ: 5,
        maxZ: 6,
      }),
      projectedBounds: {
        minX: -220.5,
        maxX: -104.5,
        minY: 47.75,
        maxY: 112.75,
      },
    };
    const backTile: Part = {
      ...part("back-tile", {
        minX: 0,
        maxX: 1,
        minY: 8,
        maxY: 10,
        minZ: 5,
        maxZ: 6,
      }),
      projectedBounds: {
        minX: -245.5,
        maxX: -179.5,
        minY: 60.25,
        maxY: 100.25,
      },
    };
    const ordered = prepareSceneOrder([cap, support, frontTile, backTile])
      .sortVisible()
      .map((p) => p.key);
    expect(ordered.indexOf("support")).toBeLessThan(ordered.indexOf("cap"));
    expect(ordered.indexOf("back-tile")).toBeLessThan(
      ordered.indexOf("front-tile"),
    );
  });

  it.each([0, 90, 180, 270] as const)(
    "un faux chevauchement de rectangles ne crée pas un cycle à %s°",
    (rotation) => {
      const parts = [
        part("door", door, rotation),
        part("side-wall", sideWall, rotation),
        part("back-wall", backWall, rotation),
      ];
      // All six insertion orders and every prefix exercise the graph rather
      // than relying on a fortunate average depth or a specific recipe order.
      for (const permutation of [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ]) {
        const input = permutation.map((index) => parts[index]);
        const prepared = prepareSceneOrder(input);
        for (const count of [3, 2, 1, 0, 3]) {
          const ordered = prepared.sortVisible(count).map((p) => p.key);
          expect(new Set(ordered)).toEqual(
            new Set(input.slice(0, count).map((p) => p.key)),
          );
          if (ordered.includes("door") && ordered.includes("side-wall")) {
            const doorIndex = ordered.indexOf("door");
            const wallIndex = ordered.indexOf("side-wall");
            if (rotation === 0 || rotation === 90)
              expect(doorIndex).toBeLessThan(wallIndex);
            else expect(wallIndex).toBeLessThan(doorIndex);
          }
        }
      }
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "la grande base et la plaque de toiture gardent leur empilement à %s°",
    (rotation) => {
      const base = part(
        "base",
        { minX: 0, maxX: 6, minY: 0, maxY: 6, minZ: 0, maxZ: 1 },
        rotation,
      );
      const roof = part(
        "roof",
        { minX: 1, maxX: 5, minY: 1, maxY: 5, minZ: 10, maxZ: 11 },
        rotation,
      );
      const parts = [
        roof,
        part("door", door, rotation),
        part("back-wall", backWall, rotation),
        part("side-wall", sideWall, rotation),
        base,
      ];
      const ordered = prepareSceneOrder(parts).sortVisible();
      expect(ordered[0]).toBe(base);
      expect(ordered.at(-1)).toBe(roof);
      expect(new Set(ordered)).toEqual(new Set(parts));
    },
  );
});
