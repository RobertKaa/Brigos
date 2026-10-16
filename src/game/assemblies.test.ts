import { describe, expect, it } from "vitest";
import { ASSEMBLIES } from "./assemblies";
import type { AssemblyPlacement } from "./assemblies";
import { MODELS, RECIPES, pieceCount } from "./catalog";
import { validateAssembly } from "./assemblyValidation";
import { rotatedSize, rotateModelPoint } from "./geometry";

function part(
  modelId: string,
  x = 0,
  y = 0,
  z = 0,
  rotation: AssemblyPlacement["rotation"] = 0,
): AssemblyPlacement {
  return {
    key: `${modelId}-${x}-${y}-${z}-${rotation}`,
    modelId,
    x,
    y,
    z,
    rotation,
  };
}

describe("buildable construction plans", () => {
  it("offers distinct plans while retiring implausible constructions", () => {
    expect(ASSEMBLIES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ASSEMBLIES.map((assembly) => assembly.id)).size).toBe(
      ASSEMBLIES.length,
    );
    for (const id of ["car", "rocket", "submarine", "windmill", "snail"])
      expect(ASSEMBLIES.some((assembly) => assembly.id === id)).toBe(false);
    expect(
      ASSEMBLIES.some((assembly) => assembly.placements.length <= 10),
    ).toBe(true);
    expect(ASSEMBLIES.some((assembly) => assembly.placements.length > 30)).toBe(
      true,
    );
  });

  it("offers three small beginner plans using common pieces in every color", () => {
    for (const id of ["armchair", "pyramid", "starter-bridge"]) {
      const assembly = ASSEMBLIES.find((candidate) => candidate.id === id)!;
      expect(assembly.difficulty).toBe("Premiers pas");
      expect(assembly.placements.length).toBeGreaterThanOrEqual(6);
      expect(assembly.placements.length).toBeLessThanOrEqual(10);
      for (const placement of assembly.placements) {
        expect(placement.colorId).toBeUndefined();
        expect(
          MODELS.find((model) => model.id === placement.modelId)!.tier,
        ).toBe(0);
      }
    }
  });

  it("offers legendary projects at increasing scales using substantial structural pieces", () => {
    const legendary = ASSEMBLIES.filter(
      (assembly) => assembly.difficulty === "Légendaire",
    );
    expect(legendary.length).toBeGreaterThanOrEqual(3);
    expect(
      legendary.every((assembly) => assembly.placements.length >= 900),
    ).toBe(true);
    expect(
      legendary.some((assembly) => assembly.placements.length >= 2000),
    ).toBe(true);
    expect(
      legendary.some((assembly) => assembly.placements.length >= 3000),
    ).toBe(true);
    for (const assembly of legendary) {
      const models = assembly.placements.map((part) =>
        MODELS.find((model) => model.id === part.modelId)!,
      );
      expect(
        models.filter((model) => Math.max(model.width, model.depth) >= 4)
          .length,
        assembly.id,
      ).toBeGreaterThan(models.length * 0.45);
      expect(
        models.filter((model) => model.width === 1 && model.depth === 1).length,
        assembly.id,
      ).toBeLessThan(models.length * 0.15);
    }
  });

  it("requires only active, obtainable models for every current plan", () => {
    const activeModels = new Set(
      MODELS.filter((model) => !model.archived).map((model) => model.id),
    );
    for (const assembly of ASSEMBLIES)
      expect(
        assembly.placements.every((part) => activeModels.has(part.modelId)),
        assembly.id,
      ).toBe(true);
  });

  for (const assembly of ASSEMBLIES) {
    it(`${assembly.id}: every piece connects without intersecting another`, () => {
      expect(
        validateAssembly(assembly, MODELS, { checkInstructionOrder: true }),
        assembly.name,
      ).toEqual([]);
    });

    it(`${assembly.id}: bill of materials contains exactly the visible pieces`, () => {
      const recipe = RECIPES.find((candidate) => candidate.id === assembly.id)!;
      expect(recipe).toBeDefined();
      expect(pieceCount(recipe)).toBe(assembly.placements.length);
      const expected = new Map<string, number>();
      for (const placement of assembly.placements) {
        const key = `${placement.modelId}:${placement.colorId ?? "*"}`;
        expected.set(key, (expected.get(key) ?? 0) + 1);
      }
      expect(
        new Map(
          recipe.requirements.map((requirement) => [
            `${requirement.modelId}:${requirement.colorId ?? "*"}`,
            requirement.quantity,
          ]),
        ),
      ).toEqual(expected);
    });
  }

  it("orients the two sides of the house roof toward the same ridge", () => {
    const slopes = ASSEMBLIES.find(
      (assembly) => assembly.id === "house",
    )!.placements.filter((placement) => placement.modelId === "slope-2x4");
    expect(slopes.map((placement) => placement.rotation).sort()).toEqual([
      0, 180,
    ]);
    const model = MODELS.find((candidate) => candidate.id === "slope-2x4")!;
    for (const placement of slopes) {
      const highEdge = rotateModelPoint(
        model,
        { x: 0, y: 0, z: model.height },
        placement.rotation,
      );
      expect(placement.x + highEdge.x).toBe(3);
    }
  });

  it("rotates long bricks into a different footprint instead of stretching their picture", () => {
    const model = MODELS.find((candidate) => candidate.id === "brick-1x4")!;
    expect(rotatedSize(model, 90)).toEqual({ width: 4, depth: 1 });
    expect(
      validateAssembly({
        placements: [
          part("brick-1x4", 0, 0, 0, 90),
          part("brick-1x1", 3, 0, 3),
        ],
      }),
    ).toEqual([]);
  });

  it("rejects interpenetrating pieces", () => {
    expect(
      validateAssembly({
        placements: [part("brick-2x2"), part("brick-1x1", 1, 1, 1)],
      }).some((issue) => issue.type === "overlap"),
    ).toBe(true);
  });

  it("rejects a notice that adds its support later, even when the final scene connects", () => {
    const placements = [part("brick-2x2", 0, 0, 3), part("brick-2x2")];
    expect(validateAssembly({ placements })).toEqual([]);
    expect(
      validateAssembly({ placements }, MODELS, {
        checkInstructionOrder: true,
      }).some((issue) => issue.type === "instruction-order"),
    ).toBe(true);
  });

  it("reserves rounded parts' curved edges instead of ignoring corner cells", () => {
    expect(
      validateAssembly({
        placements: [part("round-4x4"), part("brick-1x1", 0, 0, 1)],
      }).some((issue) => issue.type === "overlap"),
    ).toBe(true);
  });

  it("rejects a piece balanced on a smooth tile or slope", () => {
    for (const support of ["tile-2x2", "slope-2x2"]) {
      const model = MODELS.find((candidate) => candidate.id === support)!;
      expect(
        validateAssembly({
          placements: [part(support), part("brick-1x1", 0, 0, model.height)],
        }).some((issue) => issue.type === "unsupported"),
      ).toBe(true);
    }
  });

  it("clips conical crowns through their central tops, never their sloping sides or apex", () => {
    expect(
      validateAssembly({
        placements: [
          part("cone-6x6"),
          part("cone-4x4", 1, 1, 6),
          part("cone-2x2", 2, 2, 12),
        ],
      }),
    ).toEqual([]);
    for (const placements of [
      [part("cone-6x6"), part("brick-1x1", 0, 2, 6)],
      [part("cone-2x2"), part("brick-1x1", 0, 0, 6)],
    ])
      expect(
        validateAssembly({ placements }).some(
          (issue) => issue.type === "unsupported",
        ),
      ).toBe(true);
  });

  it("rejects floating pieces and separated ground components", () => {
    expect(
      validateAssembly({ placements: [part("brick-1x1", 0, 0, 3)] }).some(
        (issue) => issue.type === "unsupported",
      ),
    ).toBe(true);
    expect(
      validateAssembly({
        placements: [part("brick-1x1"), part("brick-1x1", 4, 0)],
      }).some((issue) => issue.type === "disconnected"),
    ).toBe(true);
  });

  it("requires a stud underneath an arch pillar, not underneath its empty opening", () => {
    expect(
      validateAssembly({
        placements: [part("brick-1x1", 0, 1), part("arch-1x4", 0, 0, 3)],
      }).some((issue) => issue.type === "unsupported"),
    ).toBe(true);
    expect(
      validateAssembly({
        placements: [part("brick-1x1"), part("arch-1x4", 0, 0, 3)],
      }),
    ).toEqual([]);
  });

  it("rejects invalid grid coordinates and duplicate placement identities", () => {
    const first = part("brick-1x1");
    expect(
      validateAssembly({ placements: [first, { ...first, z: 3 }] }).some(
        (issue) => issue.type === "duplicate-key",
      ),
    ).toBe(true);
    expect(
      validateAssembly({ placements: [{ ...first, x: 0.25 }] }).some(
        (issue) => issue.type === "invalid-position",
      ),
    ).toBe(true);
    expect(
      validateAssembly({
        placements: [{ ...first, modelId: "missing-model" }],
      }).some((issue) => issue.type === "unknown-model"),
    ).toBe(true);
  });
});
