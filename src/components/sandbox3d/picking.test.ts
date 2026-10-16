import { describe, expect, it } from "vitest";
import { BRIGO_BY_ID, MODELS } from "../../game/catalog";
import { rotateModelPoint, rotatedSize } from "../../game/geometry";
import type { Rotation } from "../../game/geometry";
import type { SandboxPlacement } from "../../game/sandbox";
import {
  cellFromWorldPoint,
  isSceneTap,
  placementTransform,
  sandboxCameraFrame,
  SANDBOX_HEIGHT_SCALE,
  toWorldPoint,
} from "./picking";

const rotations: Rotation[] = [0, 90, 180, 270];
const placement = (
  changes: Partial<SandboxPlacement> = {},
): SandboxPlacement => ({
  id: "piece-a",
  brigoId: "brick-1x4:coral",
  x: 7,
  y: 9,
  z: 6,
  rotation: 0,
  ...changes,
});

describe("coordonnées du bac à sable 3D", () => {
  it("conserve les deux axes de la grille et adapte seulement la hauteur", () => {
    expect(toWorldPoint({ x: 4, y: 12, z: 9 }).toArray()).toEqual([
      4, 3.06, 12,
    ]);
    expect(toWorldPoint({ x: 0, y: 0, z: 0 }).toArray()).toEqual([0, 0, 0]);
  });

  it.each(rotations)(
    "respecte les positions du moteur de jeu à %i°, y compris les pièces asymétriques",
    (rotation) => {
      for (const model of MODELS) {
        const part = placement({ brigoId: `${model.id}:blue`, rotation });
        const matrix = placementTransform(part);
        const points = [
          { x: 0, y: 0, z: 0 },
          { x: model.width, y: model.depth, z: model.height },
          { x: 0.25, y: model.depth - 0.25, z: model.height / 2 },
        ];
        for (const point of points) {
          const rotated = rotateModelPoint(model, point, rotation);
          const expected = toWorldPoint({
            x: rotated.x + part.x,
            y: rotated.y + part.y,
            z: rotated.z + part.z,
          });
          const actual = toWorldPoint(point).applyMatrix4(matrix);
          actual.toArray().forEach((value, axis) => {
            expect(value).toBeCloseTo(expected.getComponent(axis), 12);
          });
        }
      }
    },
  );

  it("ne modifie pas le placement ni les coordonnées transmis", () => {
    const part = Object.freeze(placement({ rotation: 90 }));
    const point = Object.freeze({ x: 1, y: 2, z: 3 });
    placementTransform(part);
    toWorldPoint(point);
    cellFromWorldPoint(point, part);
    expect(part.rotation).toBe(90);
    expect(point).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("visée des cellules depuis une intersection 3D", () => {
  it("projette au sol sans utiliser l’altitude comme deuxième axe", () => {
    expect(cellFromWorldPoint({ x: 6.9, y: 12.5, z: 14.1 })).toEqual({
      x: 6,
      y: 14,
    });
    expect(cellFromWorldPoint({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0 });
    expect(cellFromWorldPoint({ x: 23.999, y: 0, z: 23.999 })).toEqual({
      x: 23,
      y: 23,
    });
  });

  it.each([
    { x: -0.0001, y: 0, z: 8 },
    { x: 8, y: 0, z: -0.0001 },
    { x: 24, y: 0, z: 8 },
    { x: 8, y: 0, z: 24 },
    { x: NaN, y: 0, z: 8 },
    { x: 8, y: Infinity, z: 8 },
    { x: 8, y: 0, z: -Infinity },
  ])("rejette une intersection hors plateau ou non finie : %j", (point) => {
    expect(cellFromWorldPoint(point)).toBeNull();
  });

  it.each(rotations)(
    "vise le dessus de la pièce touchée à %i°, même au bord d’une face ou d’un connecteur",
    (rotation) => {
      const part = placement({ rotation });
      const model = BRIGO_BY_ID.get(part.brigoId)!.model;
      const size = rotatedSize(model, rotation);
      expect(
        cellFromWorldPoint(
          { x: part.x - 0.0001, y: 5, z: part.y - 0.0001 },
          part,
        ),
      ).toEqual({ x: part.x, y: part.y });
      expect(
        cellFromWorldPoint(
          {
            x: part.x + size.width,
            y: 5,
            z: part.y + size.depth,
          },
          part,
        ),
      ).toEqual({ x: part.x + size.width - 1, y: part.y + size.depth - 1 });
      expect(
        cellFromWorldPoint(
          { x: part.x + 0.25, y: 100, z: part.y + 0.25 },
          part,
        ),
      ).toEqual({ x: part.x, y: part.y });
    },
  );

  it("garde les cellules des pièces placées contre les limites du plateau", () => {
    const part = placement({ x: 23, y: 20 });
    expect(cellFromWorldPoint({ x: 24, y: 2, z: 24 }, part)).toEqual({
      x: 23,
      y: 23,
    });
  });

  it("rejette un support inconnu ou dont l’enveloppe sort du plateau", () => {
    for (const part of [
      placement({ brigoId: "absent" }),
      placement({ x: -1 }),
      placement({ y: 22 }),
      placement({ x: 0.5 }),
      placement({ z: NaN }),
      placement({ rotation: 45 as Rotation }),
    ])
      expect(cellFromWorldPoint({ x: 12, y: 2, z: 12 }, part)).toBeNull();
  });
});

describe("cadrage de la caméra libre", () => {
  it("montre le plateau au démarrage", () => {
    const frame = sandboxCameraFrame([]);
    expect(frame.target.toArray()).toEqual([12, 0, 12]);
    expect(frame.distance).toBe(34);
  });

  it("recentre une pièce sur son enveloppe tournée, à mi-hauteur", () => {
    const frame = sandboxCameraFrame([placement({ rotation: 90 })]);
    expect(frame.target.toArray()).toEqual([
      9,
      7.5 * SANDBOX_HEIGHT_SCALE,
      9.5,
    ]);
    expect(frame.distance).toBe(8);
  });

  it("cadre les constructions hautes avec une distance adaptée", () => {
    const low = placement({ x: 2, y: 4, z: 0 });
    const high = placement({ id: "piece-b", x: 2, y: 4, z: 33 });
    const frame = sandboxCameraFrame([low, high]);
    expect(frame.target.toArray()).toEqual([2.5, 18 * SANDBOX_HEIGHT_SCALE, 6]);
    expect(frame.distance).toBeGreaterThan(sandboxCameraFrame([low]).distance);
    expect(frame.distance).toBeLessThanOrEqual(55);
  });

  it("borne le recul pour les scènes très étendues", () => {
    const frame = sandboxCameraFrame([
      placement({ x: 0, y: 0, z: 0 }),
      placement({ x: 23, y: 20, z: 33 }),
    ]);
    expect(frame.target.toArray()).toEqual([12, 18 * SANDBOX_HEIGHT_SCALE, 12]);
    expect(frame.distance).toBe(55);
  });

  it("ne laisse pas un support manquant ou une position non finie casser le recentrage", () => {
    const frame = sandboxCameraFrame([
      placement({ brigoId: "absent" }),
      placement({ x: NaN }),
    ]);
    expect(frame.target.toArray()).toEqual([12, 0, 12]);
    expect(frame.distance).toBe(34);
  });
});

describe("séparation des gestes de caméra et des clics de placement", () => {
  it("tolère le léger déplacement d’un doigt lors d’un appui", () => {
    expect(isSceneTap({ x: 50, y: 40 }, { x: 50, y: 40 }, false)).toBe(true);
    expect(isSceneTap({ x: 50, y: 40 }, { x: 53, y: 44 }, false)).toBe(true);
    expect(isSceneTap({ x: 50, y: 40 }, { x: 56, y: 40 }, false)).toBe(true);
  });

  it("ne transforme jamais une rotation ou un déplacement de caméra en placement", () => {
    expect(isSceneTap({ x: 50, y: 40 }, { x: 56.01, y: 40 }, false)).toBe(
      false,
    );
    expect(isSceneTap({ x: 50, y: 40 }, { x: 55, y: 45 }, false)).toBe(false);
  });

  it("ignore la fin d’un pincement, même si le premier doigt revient au point de départ", () => {
    expect(isSceneTap({ x: 50, y: 40 }, { x: 50, y: 40 }, true)).toBe(false);
  });

  it("rejette les coordonnées non finies", () => {
    expect(isSceneTap({ x: NaN, y: 0 }, { x: 0, y: 0 }, false)).toBe(false);
    expect(isSceneTap({ x: 0, y: 0 }, { x: 0, y: Infinity }, false)).toBe(
      false,
    );
  });
});
