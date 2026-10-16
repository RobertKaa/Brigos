import { describe, expect, it } from "vitest";
import { ARCHITECTURE_ASSEMBLIES } from "./architecture";
import { VEHICLES_ASSEMBLIES } from "./vehicles";
import { validateAssembly } from "../assemblyValidation";
import { MODELS } from "../catalog";
import { rotatedSize } from "../geometry";

describe("reviewed architecture and sculpted vehicles", () => {
  for (const assembly of [...ARCHITECTURE_ASSEMBLIES, ...VEHICLES_ASSEMBLIES]) {
    it(`${assembly.id} attaches each successive piece without overlap`, () => {
      expect(validateAssembly(assembly)).toEqual([]);
      for (let count = 1; count <= assembly.placements.length; count++) {
        expect(
          validateAssembly({
            placements: assembly.placements.slice(0, count),
          }).filter((issue) => issue.type === "unsupported"),
        ).toEqual([]);
      }
    });
  }

  it("keeps water and plants visible through open construction tops", () => {
    for (const id of ["well", "greenhouse"]) {
      const assembly = ARCHITECTURE_ASSEMBLIES.find((plan) => plan.id === id)!;
      expect(
        assembly.placements.some(
          (part) => part.modelId === "plate-6x6" && part.z > 0,
        ),
      ).toBe(false);
      expect(
        assembly.placements.some((part) => part.modelId.startsWith("slope-")),
      ).toBe(false);
    }
  });

  it("has a vertical airplane fin above the horizontal stabilizer", () => {
    const plane = VEHICLES_ASSEMBLIES.find((plan) => plan.id === "airplane")!;
    expect(
      plane.placements
        .filter((part) => part.y === 1 && part.colorId === "coral")
        .map((part) => part.z),
    ).toEqual([5, 8, 11]);
  });

  it("shows a long airplane nose ahead of the wings and a narrower tailplane", () => {
    const plane = VEHICLES_ASSEMBLIES.find((plan) => plan.id === "airplane")!;
    const bounds = plane.placements.map((part) => ({
      ...part,
      ...rotatedSize(
        MODELS.find((model) => model.id === part.modelId)!,
        part.rotation,
      ),
    }));
    const length =
      Math.max(...bounds.map((part) => part.y + part.depth)) -
      Math.min(...bounds.map((part) => part.y));
    const span =
      Math.max(...bounds.map((part) => part.x + part.width)) -
      Math.min(...bounds.map((part) => part.x));
    expect(length).toBeGreaterThan(span);
    const nose = bounds.find(
      (part) => part.modelId === "slope-2x2" && part.colorId === "blue",
    )!;
    const cockpit = bounds.find(
      (part) => part.modelId === "slope-2x2" && part.colorId === "charcoal",
    )!;
    expect(nose.y).toBeGreaterThan(cockpit.y);
    const fin = bounds.filter(
      (part) => part.colorId === "coral" && part.z >= 5,
    );
    expect(fin.every((part) => part.y < cockpit.y)).toBe(true);
  });

  it("distinguishes boat ends from a house roof and gives the sail a sloped edge", () => {
    const boat = VEHICLES_ASSEMBLIES.find((plan) => plan.id === "boat")!;
    const ends = boat.placements.filter((part) =>
      part.modelId.startsWith("slope-"),
    );
    expect(
      ends.every(
        (part) => part.colorId === "blue" && [90, 270].includes(part.rotation),
      ),
    ).toBe(true);
    const sailboat = VEHICLES_ASSEMBLIES.find(
      (plan) => plan.id === "sailboat",
    )!;
    const sailEdge = sailboat.placements.filter(
      (part) => part.modelId.startsWith("slope-") && part.colorId === "ivory",
    );
    expect(new Set(sailEdge.map((part) => part.z)).size).toBeGreaterThanOrEqual(
      4,
    );
    expect(sailEdge.every((part) => part.rotation === 90)).toBe(true);
  });

  it("removes vehicle plans that required unmodelled axles or side connections", () => {
    expect(
      [...ARCHITECTURE_ASSEMBLIES, ...VEHICLES_ASSEMBLIES].some((plan) =>
        ["car", "rocket", "submarine", "windmill"].includes(plan.id),
      ),
    ).toBe(false);
  });
});
