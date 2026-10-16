import { describe, expect, it } from "vitest";
import { LEGENDARY_GARDEN_ASSEMBLIES } from "./legendaryGardens";
import { MODELS } from "../catalog";
import { validateAssembly } from "../assemblyValidation";

describe("the Astréval garden estate", () => {
  const estate = LEGENDARY_GARDEN_ASSEMBLIES[0];

  it("offers a large legendary build made mainly from structural formats", () => {
    expect(estate.difficulty).toBe("Légendaire");
    expect(estate.placements.length).toBeGreaterThanOrEqual(900);
    expect(estate.placements.length).toBeLessThanOrEqual(1400);
    const dimensions = estate.placements.map((part) =>
      MODELS.find((model) => model.id === part.modelId)!,
    );
    expect(
      dimensions.filter((model) => Math.max(model.width, model.depth) >= 4)
        .length,
    ).toBeGreaterThan(estate.placements.length / 2);
    expect(
      dimensions.filter((model) => model.width === 1 && model.depth === 1)
        .length,
    ).toBeLessThan(estate.placements.length * 0.15);
  });

  it("connects the entire estate without collisions and places every support first", () => {
    expect(
      validateAssembly(estate, MODELS, { checkInstructionOrder: true }),
    ).toEqual([]);
  });

  it("builds planted courts and an open central fountain around the palace", () => {
    const pots = estate.placements.filter(
      (part) =>
        part.modelId === "round-2x2" &&
        part.colorId === "brown" &&
        part.z === 3,
    );
    expect(pots).toHaveLength(24);
    expect(
      estate.placements.filter((part) => part.modelId.startsWith("arch-"))
        .length,
    ).toBeGreaterThan(40);
    expect(
      estate.placements.some(
        (part) => part.modelId === "round-4x4" && part.colorId === "blue",
      ),
    ).toBe(true);
    expect(
      estate.placements.some(
        (part) =>
          part.modelId === "special-cross" &&
          part.colorId === "yellow" &&
          part.z > 40,
      ),
    ).toBe(true);
  });
});
