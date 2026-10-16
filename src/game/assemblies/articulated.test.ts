import { describe, expect, it } from "vitest";
import { MODELS } from "../catalog";
import { validateAssembly } from "../assemblyValidation";
import { footprintCells, studCenters } from "../geometry";
import type { AssemblyPlacement } from "./layout";
import { ARTICULATED_ASSEMBLIES } from "./articulated";

const modelFor = (part: AssemblyPlacement) =>
  MODELS.find((model) => model.id === part.modelId)!;
const footprint = (part: AssemblyPlacement) =>
  footprintCells(modelFor(part), part.rotation).map((cell) => ({
    x: part.x + cell.x,
    y: part.y + cell.y,
  }));

describe("constructions Brigo à articulations visibles", () => {
  it("ajoute trois silhouettes distinctes sans reprendre les identités publiées", () => {
    expect(ARTICULATED_ASSEMBLIES.map((plan) => plan.id)).toEqual([
      "cartographer-chest",
      "canal-liftbridge",
      "articulated-chart-desk",
    ]);
    expect(new Set(ARTICULATED_ASSEMBLIES.map((plan) => plan.theme))).toEqual(
      new Set(["objects", "architecture"]),
    );
    for (const plan of ARTICULATED_ASSEMBLIES) {
      expect(plan.placements.length).toBeGreaterThanOrEqual(18);
      expect(plan.placements.length).toBeLessThanOrEqual(50);
      expect(
        plan.placements.filter((part) => part.modelId === "special-hinge"),
      ).toHaveLength(2);
      expect(
        plan.placements.some((part) =>
          ["special-wheel", "special-axle"].includes(part.modelId),
        ),
      ).toBe(false);
    }
  });

  for (const plan of ARTICULATED_ASSEMBLIES) {
    it(`${plan.id} assemble ses supports avant les pièces qu’ils portent`, () => {
      expect(
        validateAssembly(plan, MODELS, { checkInstructionOrder: true }),
      ).toEqual([]);
      for (let count = 1; count <= plan.placements.length; count++) {
        expect(
          validateAssembly(
            { placements: plan.placements.slice(0, count) },
            MODELS,
            { checkInstructionOrder: true },
          ).filter((issue) =>
            ["unsupported", "instruction-order", "overlap"].includes(
              issue.type,
            ),
          ),
          `étape ${count}`,
        ).toEqual([]);
      }
    });

    it(`${plan.id} fixe chaque articulation sur des moitiés opposées sans bloquer son axe`, () => {
      for (const hinge of plan.placements.filter(
        (part) => part.modelId === "special-hinge",
      )) {
        expect(hinge.rotation).toBe(0);
        expect(hinge.colorId).toBeUndefined();
        const lowerContacts: number[] = [];
        const upperContacts: number[] = [];
        for (const part of plan.placements) {
          if (part === hinge) continue;
          if (part.z + modelFor(part).height === hinge.z) {
            for (const stud of studCenters(modelFor(part), part.rotation)) {
              const x = part.x + stud.x - hinge.x;
              const y = part.y + stud.y - hinge.y;
              if (x > 0 && x < 2 && y > 0 && y < 2) lowerContacts.push(y);
            }
          }
          if (part.z === hinge.z + modelFor(hinge).height) {
            for (const cell of footprint(part)) {
              const x = cell.x - hinge.x;
              const y = cell.y - hinge.y;
              if (x >= 0 && x < 2 && y >= 0 && y < 2) upperContacts.push(y);
            }
          }
        }
        expect(lowerContacts).toHaveLength(2);
        expect(lowerContacts.every((y) => y === 0.5)).toBe(true);
        expect(upperContacts).toHaveLength(2);
        expect(upperContacts.every((y) => y === 1)).toBe(true);
      }
    });
  }

  it("coiffe les appuis fixes avec des surfaces lisses sous le couvercle, le tablier et le bureau", () => {
    const lidModels = new Set(["plate-4x6", "plate-4x4"]);
    for (const plan of ARTICULATED_ASSEMBLIES) {
      const hinge = plan.placements.find(
        (part) => part.modelId === "special-hinge",
      )!;
      const movingTop = plan.placements.find(
        (part) => part.z === hinge.z + 2 && lidModels.has(part.modelId),
      )!;
      expect(movingTop).toBeDefined();
      const topCells = new Set(
        footprint(movingTop).map(({ x, y }) => `${x}:${y}`),
      );
      const fixedPads = plan.placements.filter(
        (part) =>
          part.z + modelFor(part).height === movingTop.z &&
          part.modelId !== "special-hinge" &&
          footprint(part).some(({ x, y }) => topCells.has(`${x}:${y}`)),
      );
      expect(fixedPads.length).toBeGreaterThan(0);
      expect(fixedPads.every((part) => !modelFor(part).studs)).toBe(true);
    }
  });
});
