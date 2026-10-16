import { describe, expect, it } from "vitest";
import { MODELS } from "./catalog";
import type { AssemblyPlacement } from "./assemblies";
import { validateAssembly } from "./assemblyValidation";
import { rotatedSize } from "./geometry";
import type { Rotation } from "./geometry";

function part(
  key: string,
  modelId: string,
  x = 0,
  y = 0,
  z = 0,
  rotation: Rotation = 0,
): AssemblyPlacement {
  return { key, modelId, x, y, z, rotation };
}

function runningGear(): AssemblyPlacement[] {
  return [
    part("left-wheel", "special-wheel", -1, 0, 0),
    part("right-wheel", "special-wheel", 4, 0, 0),
    part("shaft", "special-axle", 0, 0.5, 2.5),
    part("bearing", "special-bearing", 1, 0, 2),
    part("chassis", "plate-2x4", 1, -1, 4),
    part("hinge", "special-hinge", 1, 0, 5),
    part("upper-body", "brick-2x2", 1, 0, 7),
  ];
}

/** Rotate the complete model, including negative origins and half-grid shafts. */
function turn(parts: AssemblyPlacement[], rotation: Rotation) {
  return parts.map((placement) => {
    const model = MODELS.find(
      (candidate) => candidate.id === placement.modelId,
    )!;
    const { width, depth } = rotatedSize(model, placement.rotation);
    const { x, y } = placement;
    const position =
      rotation === 90
        ? { x: -y - depth, y: x }
        : rotation === 180
          ? { x: -x - width, y: -y - depth }
          : rotation === 270
            ? { x: y, y: -x - width }
            : { x, y };
    return {
      ...placement,
      ...position,
      rotation: ((placement.rotation + rotation) % 360) as Rotation,
    };
  });
}

function inspect(placements: AssemblyPlacement[], instructionOrder = true) {
  return validateAssembly({ placements }, MODELS, {
    checkInstructionOrder: instructionOrder,
  });
}

describe("raccords mécaniques Brigo", () => {
  it.each([0, 90, 180, 270] as const)(
    "relie roues, essieu, vrai tunnel du palier et châssis à %s°",
    (rotation) => {
      expect(inspect(turn(runningGear(), rotation))).toEqual([]);
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "refuse une notice qui pose le palier avant son essieu à %s°",
    (rotation) => {
      const [left, right, shaft, bearing, ...body] = runningGear();
      const placements = turn([left, right, bearing, shaft, ...body], rotation);
      expect(inspect(placements, false)).toEqual([]);
      expect(inspect(placements)).toContainEqual(
        expect.objectContaining({
          type: "instruction-order",
          placementKey: "bearing",
        }),
      );
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "refuse un essieu décentré d’un demi-niveau à %s°",
    (rotation) => {
      const placements = runningGear().map((placement) =>
        placement.key === "shaft" ? { ...placement, z: 3 } : placement,
      );
      const issues = inspect(turn(placements, rotation));
      expect(issues).toContainEqual(
        expect.objectContaining({ type: "overlap", otherKey: "bearing" }),
      );
      expect(issues.some((issue) => issue.type === "disconnected")).toBe(true);
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "ne raccorde pas un moyeu juste voisin à %s°",
    (rotation) => {
      const placements = runningGear().map((placement) =>
        placement.key === "right-wheel" ? { ...placement, y: 1 } : placement,
      );
      expect(inspect(turn(placements, rotation))).toContainEqual(
        expect.objectContaining({
          type: "disconnected",
          placementKey: "right-wheel",
        }),
      );
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "ne laisse jamais une brique traverser un essieu sur demi-grille à %s°",
    (rotation) => {
      const placements = [
        ...runningGear(),
        part("obstacle", "brick-1x1", 0, 0, 1),
      ];
      expect(inspect(turn(placements, rotation))).toContainEqual(
        expect.objectContaining({ type: "overlap", otherKey: "obstacle" }),
      );
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "indexe aussi la deuxième rangée traversée par l’essieu à %s°",
    (rotation) => {
      const placements = [
        ...runningGear(),
        part("obstacle", "brick-1x1", 0, 1, 1),
      ];
      expect(inspect(turn(placements, rotation))).toContainEqual(
        expect.objectContaining({ type: "overlap", otherKey: "obstacle" }),
      );
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "le tunnel du palier ne dispense pas de collision avec ses lèvres à %s°",
    (rotation) => {
      const placements = runningGear().map((placement) =>
        placement.key === "bearing" ? { ...placement, z: 1 } : placement,
      );
      expect(inspect(turn(placements, rotation))).toContainEqual(
        expect.objectContaining({ type: "overlap", otherKey: "bearing" }),
      );
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "exige le même axe pour le palier et l’essieu à %s°",
    (rotation) => {
      const placements = runningGear().map((placement) =>
        placement.key === "bearing"
          ? { ...placement, rotation: 90 as const }
          : placement,
      );
      const issues = inspect(turn(placements, rotation));
      expect(issues.some((issue) => issue.type === "overlap")).toBe(true);
      expect(issues).toContainEqual(
        expect.objectContaining({
          type: "unsupported",
          placementKey: "bearing",
        }),
      );
    },
  );

  it("refuse un train entier relié mais suspendu en l’air", () => {
    const placements = runningGear().map((placement) => ({
      ...placement,
      z: placement.z + 1,
    }));
    const issues = inspect(placements, false);
    expect(issues).toContainEqual(
      expect.objectContaining({ type: "unsupported", placementKey: "shaft" }),
    );
  });

  it("ne prend pas le dessus d’une pile flottante pour son support inférieur", () => {
    expect(
      inspect(
        [
          part("upper", "brick-2x2", 0, 0, 6),
          part("lower", "brick-2x2", 0, 0, 3),
        ],
        false,
      ),
    ).toContainEqual(
      expect.objectContaining({ type: "unsupported", placementKey: "lower" }),
    );
  });

  it("ne traite jamais un pneu ou un essieu lisse comme une pièce à douilles", () => {
    for (const modelId of ["special-wheel", "special-axle"])
      expect(
        inspect([
          part("base", "brick-2x2"),
          part("smooth-mechanism", modelId, 0, 0, 3),
        ]),
      ).toContainEqual(
        expect.objectContaining({
          type: "unsupported",
          placementKey: "smooth-mechanism",
        }),
      );
  });

  it("ne relie ni deux pneus voisins ni deux extrémités d’essieu", () => {
    for (const [modelId, width] of [
      ["special-wheel", 1],
      ["special-axle", 4],
    ] as const)
      expect(
        inspect([part("a", modelId), part("b", modelId, width)]),
      ).toContainEqual(
        expect.objectContaining({ type: "disconnected", placementKey: "b" }),
      );
  });

  it.each([
    part("p", "brick-1x1", 0.5),
    part("p", "special-wheel", 0, 0.5),
    part("p", "special-hinge", 0, 0, 0.5),
    part("p", "special-bearing", 0, 0, 0.5),
    part("p", "special-axle", 0.5, 0.5, 2.5),
    part("p", "special-axle", 0.5, 0.5, 2.5, 90),
    part("p", "special-axle", 0, 0.25, 2.5),
    part("p", "special-axle", 0, 0.5, 2.25),
    part("p", "special-axle", 0, Infinity, 2.5),
    part("p", "special-axle", 0, 0.5, Number.NaN),
  ])("borne strictement la demi-grille mécanique : %j", (placement) => {
    expect(inspect([placement])).toContainEqual(
      expect.objectContaining({ type: "invalid-position", placementKey: "p" }),
    );
  });
});
