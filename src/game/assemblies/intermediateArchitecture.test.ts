import { describe, expect, it } from "vitest";
import { INTERMEDIATE_ARCHITECTURE_ASSEMBLIES } from "./intermediateArchitecture";
import { MODELS } from "../catalog";
import { validateAssembly } from "../assemblyValidation";

describe("intermediate architecture library", () => {
  for (const assembly of INTERMEDIATE_ARCHITECTURE_ASSEMBLIES) {
    it(`${assembly.id} has an attached, collision-free, ordered construction`, () => {
      const issues = validateAssembly(assembly, MODELS, {
        checkInstructionOrder: true,
      });
      expect(
        issues.map((issue) => ({
          ...issue,
          part: assembly.placements.find(
            (part) => part.key === issue.placementKey,
          ),
          other: assembly.placements.find(
            (part) => part.key === issue.otherKey,
          ),
        })),
      ).toEqual([]);
    });
  }

  it("offers ten distinct, detailed models using active parts", () => {
    expect(INTERMEDIATE_ARCHITECTURE_ASSEMBLIES).toHaveLength(10);
    expect(
      new Set(INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.map((plan) => plan.id)).size,
    ).toBe(10);
    expect(
      new Set(
        INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.map((plan) =>
          JSON.stringify(plan.placements.map(({ key: _key, ...part }) => part)),
        ),
      ).size,
    ).toBe(10);
    const modelById = new Map(MODELS.map((model) => [model.id, model]));
    for (const plan of INTERMEDIATE_ARCHITECTURE_ASSEMBLIES) {
      expect(
        new Set(plan.placements.map((part) => part.modelId)).size,
      ).toBeGreaterThanOrEqual(8);
      for (const part of plan.placements)
        expect(modelById.get(part.modelId)?.archived).not.toBe(true);
      expect(
        plan.placements.filter((part) => part.modelId === "brick-1x1").length /
          plan.placements.length,
      ).toBeLessThan(0.2);
      expect(
        plan.placements.filter((part) => part.z <= 1).length /
          plan.placements.length,
      ).toBeLessThan(0.2);
    }
  });

  it("fills the progression gap with four progressively larger bands", () => {
    const counts = INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.map(
      (plan) => plan.placements.length,
    );
    expect(counts.every((count) => count >= 50 && count < 900)).toBe(true);
    for (const [min, max] of [
      [50, 140],
      [140, 280],
      [280, 500],
      [500, 900],
    ])
      expect(counts.some((count) => count >= min && count < max)).toBe(true);
  });

  it("keeps a tall exposed lighthouse lamp and an objective above the observatory dome", () => {
    const lighthouse = INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.find(
      (plan) => plan.id === "harbour-lighthouse",
    )!;
    const lamps = lighthouse.placements.filter(
      (part) => part.modelId === "round-2x2" && part.colorId === "yellow",
    );
    const cap = lighthouse.placements.find(
      (part) => part.modelId === "plate-6x6" && part.colorId === "charcoal",
    )!;
    expect(
      Math.max(...lamps.map((part) => part.z + 3)) -
        Math.min(...lamps.map((part) => part.z)),
    ).toBeGreaterThanOrEqual(12);
    expect(cap.z).toBeGreaterThanOrEqual(Math.max(...lamps.map((part) => part.z + 3)));
    const observatory = INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.find(
      (plan) => plan.id === "star-observatory",
    )!;
    const dome = observatory.placements.find(
      (part) => part.modelId === "round-4x4" && part.colorId === "violet",
    )!;
    const objective = observatory.placements.find(
      (part) => part.modelId === "brick-1x2" && part.colorId === "blue",
    )!;
    expect(objective.z).toBeGreaterThanOrEqual(dome.z + 6);
    expect(objective.x).toBeGreaterThan(dome.x + 3);
  });

  it("gives the station a raised clock and the fort genuine arched openings", () => {
    const station = INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.find(
      (plan) => plan.id === "travellers-station",
    )!;
    const clockHands = station.placements.filter(
      (part) =>
        part.modelId.startsWith("brick-") &&
        part.colorId === "charcoal" &&
        part.z > 30,
    );
    expect(
      new Set(clockHands.map((part) => part.z)).size,
    ).toBeGreaterThanOrEqual(2);
    const fort = INTERMEDIATE_ARCHITECTURE_ASSEMBLIES.find(
      (plan) => plan.id === "cape-fort",
    )!;
    expect(
      fort.placements.some((part) => part.modelId === "special-window"),
    ).toBe(false);
    expect(
      fort.placements.filter((part) => part.modelId.startsWith("arch-")).length,
    ).toBeGreaterThan(40);
  });
});
