import { describe, expect, it } from "vitest";
import { MODELS, RECIPE_BY_ID } from "./catalog";
import { validateAssembly } from "./assemblyValidation";
import { footprintCells } from "./geometry";

describe("cascade en terrasses et serre ajourée", () => {
  for (const id of ["terraced-waterfall", "tropical-conservatory"]) {
    it(`${id} conserve des attaches et un ordre de montage valides`, () => {
      expect(
        validateAssembly(RECIPE_BY_ID.get(id)!, MODELS, {
          checkInstructionOrder: true,
        }),
      ).toEqual([]);
    });
  }

  it("la cascade descend sur trois terrasses avec un bassin au-delà des chutes", () => {
    const recipe = RECIPE_BY_ID.get("terraced-waterfall")!;
    const lips = recipe.placements
      .filter(
        (part) =>
          part.modelId === "tile-1x4" && part.colorId === "ivory" && part.z > 3,
      )
      .sort((a, b) => a.y - b.y);
    expect(lips).toHaveLength(3);
    for (let index = 1; index < lips.length; index++)
      expect(lips[index].z).toBeLessThan(lips[index - 1].z);
    const horizontalWater = recipe.placements.filter(
      (part) => part.modelId === "tile-2x4" && part.colorId === "blue",
    );
    expect(
      new Set(horizontalWater.map((part) => part.z)).size,
    ).toBeGreaterThanOrEqual(3);
    expect(
      recipe.placements.some(
        (part) =>
          part.modelId.startsWith("plate-") &&
          part.colorId === "blue" &&
          part.y > lips[lips.length - 1].y &&
          part.z < lips[lips.length - 1].z,
      ),
    ).toBe(true);
  });

  it("la charpente de serre monte franchement et garde la majorité du toit ouverte", () => {
    const recipe = RECIPE_BY_ID.get("tropical-conservatory")!;
    const roof = recipe.placements.filter((part) => part.z >= 23);
    const top = Math.max(
      ...roof.map(
        (part) =>
          part.z + MODELS.find((model) => model.id === part.modelId)!.height,
      ),
    );
    expect(top - 23).toBeGreaterThanOrEqual(18);
    const occupied = new Set<string>();
    for (const part of roof) {
      const model = MODELS.find((candidate) => candidate.id === part.modelId)!;
      for (const cell of footprintCells(model, part.rotation))
        occupied.add(`${part.x + cell.x},${part.y + cell.y}`);
    }
    expect(occupied.size / (28 * 32)).toBeLessThan(0.5);
    expect(
      recipe.placements.some(
        (part) =>
          part.modelId === "slope-2x2" && part.z > 23 && part.rotation === 180,
      ),
    ).toBe(true);
    expect(
      recipe.placements.some(
        (part) =>
          part.modelId === "slope-2x2" && part.z > 23 && part.rotation === 0,
      ),
    ).toBe(true);
  });
});
