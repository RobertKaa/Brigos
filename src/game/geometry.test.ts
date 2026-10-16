import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BRIGO_BY_ID, MODELS, RECIPES, RECIPE_BY_ID } from "./catalog";
import type { Recipe } from "./catalog";
import {
  footprintCells,
  rotateModelPoint,
  rotatedSize,
  studCenters,
} from "./geometry";
import type { Rotation } from "./geometry";
import { brigoGeometry, ConstructionArt } from "../components/BrigoArt";

const rotations: Rotation[] = [0, 90, 180, 270];
const model = (id: string) => MODELS.find((candidate) => candidate.id === id)!;

describe("géométrie des pièces et scènes", () => {
  it("tourne une pièce rectangulaire dans un rectangle normalisé", () => {
    const brick = model("brick-1x4");
    expect(rotatedSize(brick, 90)).toEqual({ width: 4, depth: 1 });
    expect(rotateModelPoint(brick, { x: 0.5, y: 3.5, z: 3 }, 90)).toEqual({
      x: 0.5,
      y: 0.5,
      z: 3,
    });
    expect(rotateModelPoint(brick, { x: 0.5, y: 3.5, z: 3 }, 180)).toEqual({
      x: 0.5,
      y: 0.5,
      z: 3,
    });
    for (const rotation of rotations) {
      const size = rotatedSize(brick, rotation);
      for (const cell of footprintCells(brick, rotation)) {
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(size.width);
        expect(cell.y).toBeLessThan(size.depth);
      }
    }
  });

  it("respecte les découpes de l’angle et de la croix", () => {
    expect(footprintCells(model("special-corner"))).toHaveLength(3);
    expect(footprintCells(model("special-cross"))).toHaveLength(5);
    for (const rotation of rotations) {
      expect(studCenters(model("special-corner"), rotation)).toHaveLength(3);
      expect(studCenters(model("special-cross"), rotation)).toHaveLength(5);
    }
    expect(studCenters(model("tile-2x2"))).toHaveLength(0);
    expect(studCenters(model("slope-2x2"))).toHaveLength(0);
  });

  it("garde la totalité des tenons à l’intérieur des pièces arrondies", () => {
    expect(studCenters(model("round-1x1"))).toHaveLength(1);
    expect(studCenters(model("round-2x2"))).toHaveLength(4);
    for (const rounded of MODELS.filter(
      (candidate) => candidate.shape === "round",
    ))
      for (const stud of studCenters(rounded))
        for (let i = 0; i < 64; i++) {
          const angle = (i * Math.PI) / 32;
          const x =
            (stud.x + Math.cos(angle) * 0.28 - rounded.width / 2) /
            (rounded.width / 2);
          const y =
            (stud.y + Math.sin(angle) * 0.28 - rounded.depth / 2) /
            (rounded.depth / 2);
          expect(x * x + y * y).toBeLessThanOrEqual(1.0001);
        }
  });

  it("produit des silhouettes finies à chaque orientation pour tout le catalogue", () => {
    for (const part of MODELS) {
      const brigo = BRIGO_BY_ID.get(`${part.id}:blue`)!;
      for (const rotation of rotations) {
        const result = brigoGeometry(brigo, rotation);
        expect(result.primitives.length).toBeGreaterThan(0);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(Number.isFinite(result.width + result.height)).toBe(true);
        expect(
          result.primitives.every(
            (primitive) => !/NaN|Infinity/.test(primitive.d),
          ),
        ).toBe(true);
      }
    }
    const slope = BRIGO_BY_ID.get("slope-2x2:coral")!;
    expect(
      brigoGeometry(slope, 0).primitives.map((primitive) => primitive.d),
    ).not.toEqual(
      brigoGeometry(slope, 180).primitives.map((primitive) => primitive.d),
    );
  });

  it("limite les attaches des cônes à leur sommet plat et garde la pointe lisse", () => {
    expect(studCenters(model("cone-2x2"))).toEqual([]);
    for (const size of [4, 6]) {
      const cone = model(`cone-${size}x${size}`);
      for (const rotation of rotations) {
        const centers = studCenters(cone, rotation);
        expect(centers).toHaveLength(4);
        for (const center of centers) {
          expect(Math.abs(center.x - size / 2)).toBe(0.5);
          expect(Math.abs(center.y - size / 2)).toBe(0.5);
          for (let i = 0; i < 64; i++) {
            const angle = (i * Math.PI) / 32;
            expect(
              (center.x - size / 2 + Math.cos(angle) * 0.28) ** 2 +
                (center.y - size / 2 + Math.sin(angle) * 0.28) ** 2,
            ).toBeLessThanOrEqual(1.0001);
          }
        }
      }
    }
  });

  it("garde visibles tous les tenons des briques et plaques allongées", () => {
    for (const [id, expectedStuds] of [
      ["brick-1x4:coral", 4],
      ["plate-1x3:violet", 3],
      ["plate-6x6:blue", 36],
    ] as const)
      for (const rotation of rotations) {
        const brigo = BRIGO_BY_ID.get(id)!;
        const primitives = brigoGeometry(brigo, rotation).primitives;
        const firstStud = primitives.findIndex(
          (primitive) => primitive.surface === "stud",
        );
        expect(firstStud).toBeGreaterThan(0);
        expect(
          primitives
            .slice(firstStud)
            .every((primitive) => primitive.surface === "stud"),
        ).toBe(true);
        const groups = primitives
          .filter((primitive) => primitive.studCenter)
          .map((primitive) => JSON.stringify(primitive.studCenter));
        expect(new Set(groups).size).toBe(expectedStuds);
        // Each cap, wall and highlight stays adjacent to the same complete stud.
        const uniqueSequence = groups.filter(
          (group, index) => index === 0 || group !== groups[index - 1],
        );
        expect(uniqueSequence).toHaveLength(expectedStuds);
      }
  });

  it.each(RECIPES)(
    "dessine chaque emplacement de $id une fois et garde le cadrage pendant les étapes",
    (recipe) => {
      const full = renderToStaticMarkup(
        createElement(ConstructionArt, { recipeId: recipe.id }),
      );
      const uniqueKeys = new Set(
        [...full.matchAll(/data-placement="([^"]+)"/g)].map(
          (match) => match[1],
        ),
      );
      expect(uniqueKeys.size).toBe(recipe.placements.length);
      const beginning = renderToStaticMarkup(
        createElement(ConstructionArt, { recipeId: recipe.id, step: 0 }),
      );
      expect(beginning.match(/viewBox="([^"]+)"/)?.[1]).toBe(
        full.match(/viewBox="([^"]+)"/)?.[1],
      );
      expect(beginning).not.toContain("data-placement=");
      const first = renderToStaticMarkup(
        createElement(ConstructionArt, {
          recipeId: recipe.id,
          step: 1,
          rotation: 90,
        }),
      );
      expect(
        new Set(
          [...first.matchAll(/data-placement="([^"]+)"/g)].map(
            (match) => match[1],
          ),
        ).size,
      ).toBe(1);
    },
  );

  it("réserve les couleurs imposées avant d’attribuer les pièces à couleur libre", () => {
    const recipe: Recipe = {
      id: "geometry-allocation-test",
      name: "Test",
      description: "Test",
      difficulty: "Premiers pas",
      color: "#ffffff",
      requirements: [],
      placements: [
        { key: "free", modelId: "brick-1x1", x: 0, y: 0, z: 0, rotation: 0 },
        {
          key: "coral",
          modelId: "brick-1x1",
          colorId: "coral",
          x: 0,
          y: 0,
          z: 3,
          rotation: 0,
        },
      ],
    };
    RECIPE_BY_ID.set(recipe.id, recipe);
    try {
      const image = renderToStaticMarkup(
        createElement(ConstructionArt, {
          recipeId: recipe.id,
          pieces: { "brick-1x1:coral": 1, "brick-1x1:blue": 1 },
        }),
      );
      expect(image).toContain(
        'data-placement="free" data-model="brick-1x1" data-brigo="brick-1x1:blue"',
      );
      expect(image).toContain(
        'data-placement="coral" data-model="brick-1x1" data-brigo="brick-1x1:coral"',
      );
    } finally {
      RECIPE_BY_ID.delete(recipe.id);
    }
  });

  it.each(RECIPES)(
    "dessine les pièces empilées de $id avant celles du dessus, dans les quatre vues",
    (recipe) => {
      const boxes = recipe.placements.map((placement) => {
        const partModel = model(placement.modelId);
        const size = rotatedSize(partModel, placement.rotation);
        return {
          ...placement,
          maxX: placement.x + size.width,
          maxY: placement.y + size.depth,
          top: placement.z + partModel.height,
        };
      });
      for (const rotation of rotations) {
        const image = renderToStaticMarkup(
          createElement(ConstructionArt, { recipeId: recipe.id, rotation }),
        );
        const order = image.match(/data-render-order="([^"]+)"/)![1].split(",");
        const indices = new Map(order.map((key, index) => [key, index]));
        const errors: string[] = [];
        for (const lower of boxes)
          for (const upper of boxes) {
            const overlaps =
              lower.x < upper.maxX &&
              upper.x < lower.maxX &&
              lower.y < upper.maxY &&
              upper.y < lower.maxY;
            if (
              overlaps &&
              lower.top <= upper.z &&
              indices.get(lower.key)! >= indices.get(upper.key)!
            )
              errors.push(`${lower.key} doit précéder ${upper.key}`);
          }
        expect(errors, `${recipe.id}/${rotation}`).toEqual([]);
      }
    },
    // Four views and an exhaustive pairwise check for thousands of pieces can
    // exceed the default five seconds on a shared CI runner.
    30_000,
  );

  it("cache les tenons emboîtés et les montre avant l’ajout de la pièce supérieure", () => {
    const recipe: Recipe = {
      id: "geometry-studs-test",
      name: "Test",
      description: "Test",
      difficulty: "Premiers pas",
      color: "#ffffff",
      requirements: [],
      placements: [
        {
          key: "bottom",
          modelId: "brick-2x2",
          colorId: "ivory",
          x: 0,
          y: 0,
          z: 0,
          rotation: 0,
        },
        {
          key: "roof",
          modelId: "slope-2x2",
          colorId: "coral",
          x: 0,
          y: 0,
          z: 3,
          rotation: 180,
        },
      ],
    };
    RECIPE_BY_ID.set(recipe.id, recipe);
    try {
      for (const rotation of rotations) {
        const full = renderToStaticMarkup(
          createElement(ConstructionArt, { recipeId: recipe.id, rotation }),
        );
        const first = renderToStaticMarkup(
          createElement(ConstructionArt, {
            recipeId: recipe.id,
            rotation,
            step: 1,
          }),
        );
        expect(full).toContain('data-piece="bottom" data-visible-studs="0"');
        expect(first).toContain('data-piece="bottom" data-visible-studs="4"');
        expect(full).toContain('data-render-order="bottom,roof"');
        expect(full.match(/viewBox="([^"]+)"/)?.[1]).toBe(
          first.match(/viewBox="([^"]+)"/)?.[1],
        );
      }
    } finally {
      RECIPE_BY_ID.delete(recipe.id);
    }
  });
});
