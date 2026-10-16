import { describe, expect, it } from "vitest";
import { WHEELED_ASSEMBLIES } from "./wheeled";
import { ARTICULATED_ASSEMBLIES } from "./articulated";
import type { AssemblyPlacement } from "./layout";
import { validateAssembly } from "../assemblyValidation";
import { MODELS } from "../catalog";
import { footprintCells, rotateModelPoint, studCenters } from "../geometry";

/**
 * Separate the two rigid leaves of every hinge, then follow only real clasp
 * connections. A lid cannot move when another rigid path joins its two leaves.
 * Removing every pivot together also handles paired hinges on the same lid.
 */
function hingeAttachments(placements: AssemblyPlacement[]) {
  const parents = new Map<string, string>();
  const hinges = new Map<
    string,
    {
      leaves: [string, string];
      centers: Map<string, string>;
      lower: Set<string>;
      upper: Set<string>;
    }
  >();
  const pointKey = (x: number, y: number) => `${x},${y}`;
  const addNode = (node: string) => parents.set(node, node);
  const root = (node: string): string => {
    const parent = parents.get(node)!;
    if (parent === node) return node;
    const result = root(parent);
    parents.set(node, result);
    return result;
  };
  for (const placement of placements) {
    if (placement.modelId !== "special-hinge") {
      addNode(placement.key);
      continue;
    }
    const model = MODELS.find((model) => model.id === placement.modelId)!;
    const leaves: [string, string] = [
      `${placement.key}:leaf-0`,
      `${placement.key}:leaf-1`,
    ];
    leaves.forEach(addNode);
    const centers = new Map<string, string>();
    for (const y of [0, 1])
      for (const x of [0, 1]) {
        const center = rotateModelPoint(
          model,
          { x: x + 0.5, y: y + 0.5, z: 0 },
          placement.rotation,
        );
        centers.set(
          pointKey(placement.x + center.x, placement.y + center.y),
          leaves[y],
        );
      }
    hinges.set(placement.key, {
      leaves,
      centers,
      lower: new Set(),
      upper: new Set(),
    });
  }
  const nodeAt = (placement: AssemblyPlacement, x: number, y: number) =>
    hinges.get(placement.key)?.centers.get(pointKey(x, y)) ?? placement.key;
  const tops = new Map<string, { node: string; placementKey: string }[]>();
  for (const placement of placements) {
    const model = MODELS.find((model) => model.id === placement.modelId)!;
    for (const center of studCenters(model, placement.rotation)) {
      const x = placement.x + center.x;
      const y = placement.y + center.y;
      const key = `${placement.z + model.height}:${pointKey(x, y)}`;
      const entries = tops.get(key) ?? [];
      entries.push({
        node: nodeAt(placement, x, y),
        placementKey: placement.key,
      });
      tops.set(key, entries);
    }
  }
  for (const placement of placements) {
    const model = MODELS.find((model) => model.id === placement.modelId)!;
    if (model.shape === "wheel" || model.shape === "axle") continue;
    for (const cell of footprintCells(model, placement.rotation)) {
      const x = placement.x + cell.x + 0.5;
      const y = placement.y + cell.y + 0.5;
      const node = nodeAt(placement, x, y);
      for (const support of tops.get(`${placement.z}:${pointKey(x, y)}`) ??
        []) {
        parents.set(root(node), root(support.node));
        hinges.get(placement.key)?.lower.add(node);
        hinges.get(support.placementKey)?.upper.add(support.node);
      }
    }
  }
  return [...hinges.entries()].map(([key, hinge]) => ({
    key,
    locked: root(hinge.leaves[0]) === root(hinge.leaves[1]),
    hasFrameAndPanel:
      (hinge.lower.has(hinge.leaves[0]) && hinge.upper.has(hinge.leaves[1])) ||
      (hinge.lower.has(hinge.leaves[1]) && hinge.upper.has(hinge.leaves[0])),
  }));
}

describe("nouveaux véhicules à trains roulants", () => {
  for (const plan of WHEELED_ASSEMBLIES) {
    it(`${plan.id} : raccorde tous les mécanismes dans l’ordre réel de montage`, () => {
      expect(
        validateAssembly(plan, MODELS, { checkInstructionOrder: true }),
      ).toEqual([]);
      for (let step = 1; step <= plan.placements.length; step++)
        expect(
          validateAssembly(
            { placements: plan.placements.slice(0, step) },
            MODELS,
            {
              checkInstructionOrder: true,
            },
          ).filter((issue) => issue.type !== "disconnected"),
          `étape ${step}`,
        ).toEqual([]);
      const count = (modelId: string) =>
        plan.placements.filter((p) => p.modelId === modelId).length;
      expect(count("special-wheel")).toBeGreaterThanOrEqual(2);
      expect(count("special-wheel")).toBe(count("special-axle") * 2);
      expect(count("special-bearing")).toBe(count("special-axle"));
    });
    it(`${plan.id} : accepte toutes les couleurs des mécanismes sans imposer quatre jantes identiques`, () => {
      for (const part of plan.placements.filter((p) =>
        p.modelId.startsWith("special-"),
      ))
        expect(part.colorId).toBeUndefined();
      expect(
        plan.placements.filter((p) => p.modelId === "brick-1x1").length,
      ).toBeLessThan(plan.placements.length / 4);
    });
  }
});

describe("feuilles fixes et mobiles des nouveaux mécanismes", () => {
  for (const plan of [...WHEELED_ASSEMBLIES, ...ARTICULATED_ASSEMBLIES])
    it(`${plan.id} : aucun raccord rigide ne verrouille les deux feuilles d’un pivot`, () => {
      const joints = hingeAttachments(plan.placements);
      expect(joints).toHaveLength(
        plan.placements.filter((part) => part.modelId === "special-hinge")
          .length,
      );
      for (const joint of joints) {
        expect(
          joint.locked,
          `${joint.key} : pivot court-circuité par le bâti`,
        ).toBe(false);
        expect(
          joint.hasFrameAndPanel,
          `${joint.key} : une feuille au bâti, l’autre au panneau`,
        ).toBe(true);
      }
    });

  it("détecte un support commun sous les deux feuilles, même si les dessus sont séparés", () => {
    const placements: AssemblyPlacement[] = [
      { key: "frame", modelId: "brick-2x2", x: 0, y: 0, z: 0, rotation: 0 },
      { key: "joint", modelId: "special-hinge", x: 0, y: 0, z: 3, rotation: 0 },
      { key: "fixed-cap", modelId: "tile-1x2", x: 0, y: 0, z: 5, rotation: 90 },
      { key: "panel", modelId: "tile-1x2", x: 0, y: 1, z: 5, rotation: 90 },
    ];
    expect(hingeAttachments(placements)).toEqual([
      { key: "joint", locked: true, hasFrameAndPanel: true },
    ]);
  });

  it("détecte aussi un verrouillage indirect par une traverse au-dessus de deux panneaux distincts", () => {
    const placements: AssemblyPlacement[] = [
      { key: "frame", modelId: "plate-1x2", x: 0, y: 0, z: 0, rotation: 90 },
      { key: "joint", modelId: "special-hinge", x: 0, y: 0, z: 1, rotation: 0 },
      {
        key: "fixed-cap",
        modelId: "plate-1x2",
        x: 0,
        y: 0,
        z: 3,
        rotation: 90,
      },
      { key: "panel", modelId: "plate-1x2", x: 0, y: 1, z: 3, rotation: 90 },
      { key: "brace", modelId: "plate-2x2", x: 0, y: 0, z: 4, rotation: 0 },
    ];
    expect(hingeAttachments(placements)).toEqual([
      { key: "joint", locked: true, hasFrameAndPanel: true },
    ]);
  });
});
