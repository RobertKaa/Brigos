import { describe, expect, it } from "vitest";
import { MODELS } from "../catalog";
import { validateAssembly } from "../assemblyValidation";
import { INTERMEDIATE_WORLD_ASSEMBLIES } from "./intermediateWorlds";

describe("intermediate nature, object and vehicle library", () => {
  it("offers ten distinct plans using active parts and existing themes", () => {
    expect(INTERMEDIATE_WORLD_ASSEMBLIES).toHaveLength(10);
    expect(
      new Set(INTERMEDIATE_WORLD_ASSEMBLIES.map((plan) => plan.id)).size,
    ).toBe(10);
    expect(
      new Set(INTERMEDIATE_WORLD_ASSEMBLIES.map((plan) => plan.theme)),
    ).toEqual(new Set(["nature", "objects", "vehicles"]));
    expect(
      new Set(
        INTERMEDIATE_WORLD_ASSEMBLIES.map((plan) =>
          JSON.stringify(plan.placements.map(({ key: _key, ...part }) => part)),
        ),
      ).size,
    ).toBe(10);
    const activeIds = new Set(
      MODELS.filter((model) => !model.archived).map((model) => model.id),
    );
    for (const plan of INTERMEDIATE_WORLD_ASSEMBLIES) {
      expect(["Créatif", "Expert"]).toContain(plan.difficulty);
      for (const part of plan.placements)
        expect(activeIds.has(part.modelId), `${plan.id}: ${part.modelId}`).toBe(
          true,
        );
      expect(
        plan.placements.filter((part) => part.modelId === "brick-1x1").length /
          plan.placements.length,
      ).toBeLessThan(0.12);
    }
  });

  for (const plan of INTERMEDIATE_WORLD_ASSEMBLIES) {
    it(`${plan.id}: connects every part without collision and builds supports first`, () => {
      expect(
        validateAssembly(plan, MODELS, { checkInstructionOrder: true }),
      ).toEqual([]);
    });
  }

  it("offers meaningful steps between small models and the legendary estates", () => {
    const counts = INTERMEDIATE_WORLD_ASSEMBLIES.map(
      (plan) => plan.placements.length,
    );
    for (const [min, max] of [
      [60, 139],
      [140, 279],
      [280, 450],
      [451, 800],
    ])
      expect(counts.some((count) => count >= min && count <= max)).toBe(true);
    expect(counts.every((count) => count >= 60 && count <= 800)).toBe(true);
  });

  it("builds a complete 64-square chessboard and 32 separately attached chess pieces", () => {
    const chess = INTERMEDIATE_WORLD_ASSEMBLIES.find(
      (plan) => plan.id === "grand-chessboard",
    )!;
    expect(
      chess.placements.filter(
        (part) => part.modelId === "plate-2x2" && part.z === 2,
      ),
    ).toHaveLength(64);
    expect(
      chess.placements.filter(
        (part) => part.modelId === "round-2x2" && part.z === 3,
      ),
    ).toHaveLength(32);
    expect(
      chess.placements.filter(
        (part) => part.modelId === "tile-2x2" && part.z === 3,
      ),
    ).toHaveLength(32);
  });

  it("puts the piano soundboard on structural braces and leaves its strings and keyboard visible", () => {
    const piano = INTERMEDIATE_WORLD_ASSEMBLIES.find(
      (plan) => plan.id === "concert-grand-piano",
    )!;
    expect(
      piano.placements.filter(
        (part) =>
          part.modelId === "plate-1x3" &&
          part.colorId === "ivory" &&
          part.z === 17,
      ),
    ).toHaveLength(10);
    expect(
      piano.placements.some(
        (part) => part.colorId === "yellow" && part.z === 17,
      ),
    ).toBe(true);
    expect(
      piano.placements.some(
        (part) => part.modelId === "plate-2x8" && part.z === 13,
      ),
    ).toBe(true);
    expect(piano.placements.filter((part) => part.z === 0)).toHaveLength(3);
    expect(
      piano.placements.filter(
        (part) => part.modelId === "brick-2x2" && part.z === 10,
      ),
    ).toHaveLength(3);
    expect(piano.placements.filter((part) => part.z <= 1).length).toBeLessThan(
      piano.placements.length * 0.2,
    );
  });

  it("uses broad foundation formats for the largest planted and harbor models", () => {
    for (const id of [
      "four-seasons-garden",
      "cargo-harbor",
      "tropical-conservatory",
    ]) {
      const plan = INTERMEDIATE_WORLD_ASSEMBLIES.find(
        (entry) => entry.id === id,
      )!;
      expect(
        plan.placements.some(
          (part) => part.modelId === "plate-6x6" && part.z === 0,
        ),
      ).toBe(true);
      expect(plan.placements.filter((part) => part.z <= 1).length).toBeLessThan(
        plan.placements.length * 0.2,
      );
    }
    const conservatory = INTERMEDIATE_WORLD_ASSEMBLIES.find(
      (plan) => plan.id === "tropical-conservatory",
    )!;
    expect(
      conservatory.placements.filter(
        (part) =>
          part.modelId === "plate-4x4" &&
          part.z === 14 &&
          ["green", "mint"].includes(part.colorId!),
      ),
    ).toHaveLength(12);
  });
});
