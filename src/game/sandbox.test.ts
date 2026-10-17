import { describe, expect, it } from "vitest";
import {
  adminCommand,
  buildRecipe,
  createGame,
  inventoryCount,
  MAX_VALUE,
  reservedBrigoCount,
  reservedCount,
} from "./engine";
import { recyclableCount, recycleBrigos } from "./recycling";
import {
  sandboxAutoHeight,
  sandboxPlacementIssue,
  sandboxReservedCount,
  createSandboxProject,
  renameSandboxProject,
  placeSandboxBrigo,
  moveSandboxBrigo,
  removeSandboxBrigo,
  deleteSandboxProject,
  SANDBOX_MAX_PROJECTS,
  SANDBOX_MAX_PLACEMENTS,
} from "./sandbox";
import type { SandboxCandidate, SandboxPlacement } from "./sandbox";

const BRIGO = "brick-1x1:coral";
const CANDIDATE: SandboxCandidate = {
  brigoId: BRIGO,
  x: 0,
  y: 0,
  z: 0,
  rotation: 0,
};
const stockedProject = (amount = 3) =>
  createSandboxProject(
    adminCommand(createGame(), { type: "piece", brigoId: BRIGO, amount }, true),
    "Mon idée",
  );
const projectId = (state: ReturnType<typeof createGame>) =>
  state.sandboxProjects![0].id;
const withPiece = () => {
  const state = stockedProject();
  return placeSandboxBrigo(state, projectId(state), CANDIDATE);
};
const piece = (
  candidate: Partial<SandboxCandidate> = {},
  id = "p-1",
): SandboxPlacement => ({ id, ...CANDIDATE, ...candidate });

describe("atelier libre et conservation du stock", () => {
  it("reste sauvegardable après une correction d’horloge ou une ancienne date système", () => {
    const state = stockedProject();
    const future = "2099-01-01T00:00:00.000Z";
    const restored = {
      ...state,
      sandboxProjects: [
        { ...state.sandboxProjects![0], createdAt: future, updatedAt: future },
      ],
    };
    const renamed = renameSandboxProject(
      restored,
      projectId(restored),
      "Autre nom",
    );
    const placed = placeSandboxBrigo(renamed, projectId(renamed), CANDIDATE);
    expect(placed.sandboxProjects![0].updatedAt).toBe(future);
    expect(placed.sandboxProjects![0].createdAt).toBe(future);
  });

  it("crée et renomme sans changer la monnaie, les découvertes ni les récompenses", () => {
    const initial = createGame();
    const state = createSandboxProject(initial, "  La maison des nuages  ");
    expect(state.sandboxProjects).toHaveLength(1);
    expect(state.sandboxProjects![0].name).toBe("La maison des nuages");
    expect(initial.sandboxProjects).toEqual([]);
    const renamed = renameSandboxProject(
      state,
      projectId(state),
      "Nouvelle idée",
    );
    expect(renamed.sandboxProjects![0].name).toBe("Nouvelle idée");
    expect(renamed.coins).toBe(initial.coins);
    expect(renamed.engagement).toEqual(initial.engagement);
    expect(renamed.claimedAchievements).toEqual(initial.claimedAchievements);
    expect(renamed.discovered).toEqual([]);
    expect(renamed.constructions).toEqual([]);
    expect(renamed.inventory).toEqual({});
  });

  it("réserve exactement un exemplaire puis le restitue une seule fois", () => {
    const state = stockedProject(1);
    const placed = placeSandboxBrigo(state, projectId(state), CANDIDATE);
    expect(placed.inventory[BRIGO]).toBeUndefined();
    expect(state.inventory[BRIGO]).toBe(1);
    expect(sandboxReservedCount(placed)).toBe(1);
    expect(reservedCount(placed)).toBe(1);
    expect(reservedBrigoCount(placed, BRIGO)).toBe(1);
    expect(() =>
      placeSandboxBrigo(placed, projectId(placed), { ...CANDIDATE, x: 1 }),
    ).toThrow("stock");
    const placementId = placed.sandboxProjects![0].placements[0].id;
    const restored = removeSandboxBrigo(placed, projectId(placed), placementId);
    expect(restored.inventory[BRIGO]).toBe(1);
    expect(restored.sandboxProjects![0].placements).toEqual([]);
    expect(() =>
      removeSandboxBrigo(restored, projectId(restored), placementId),
    ).toThrow("plus");
  });

  it("déplace et tourne un exemplaire sans consommer ni recréer de stock", () => {
    const state = withPiece();
    const placementId = state.sandboxProjects![0].placements[0].id;
    const moved = moveSandboxBrigo(state, projectId(state), placementId, {
      ...CANDIDATE,
      x: 5,
      y: 7,
      z: 12,
      rotation: 270,
    });
    expect(moved.inventory).toBe(state.inventory);
    expect(moved.sandboxProjects![0].placements).toEqual([
      { ...CANDIDATE, id: placementId, x: 5, y: 7, z: 12, rotation: 270 },
    ]);
    expect(() =>
      moveSandboxBrigo(state, projectId(state), placementId, {
        ...CANDIDATE,
        brigoId: "brick-1x1:blue",
      }),
    ).toThrow("même pièce");
    expect(state.sandboxProjects![0].placements[0].x).toBe(0);
  });

  it("démonte une création avec ses références exactes sans affecter une autre création", () => {
    let state = withPiece();
    state = placeSandboxBrigo(state, projectId(state), { ...CANDIDATE, z: 3 });
    const firstId = projectId(state);
    state = createSandboxProject(state, "Autre idée");
    const otherId = state.sandboxProjects![1].id;
    state = placeSandboxBrigo(state, otherId, CANDIDATE);
    expect(inventoryCount(state) + reservedCount(state)).toBe(3);
    const removed = deleteSandboxProject(state, firstId);
    expect(removed.inventory[BRIGO]).toBe(2);
    expect(removed.sandboxProjects).toEqual([state.sandboxProjects![1]]);
    expect(sandboxReservedCount(removed, BRIGO)).toBe(1);
    expect(sandboxReservedCount(removed, "brick-1x1:blue")).toBe(0);
    expect(() => deleteSandboxProject(removed, firstId)).toThrow("plus");
  });

  it("n’expose jamais les pièces réservées au recyclage ou aux plans", () => {
    let state = withPiece();
    expect(recyclableCount(state, BRIGO)).toBe(2);
    state = recycleBrigos(state, BRIGO, 2);
    expect(state.inventory[BRIGO]).toBeUndefined();
    expect(sandboxReservedCount(state, BRIGO)).toBe(1);
    expect(() => recycleBrigos(state, BRIGO, 1)).toThrow("Gardez");
    expect(() => buildRecipe(state, "totem")).toThrow("manque");
    expect(
      removeSandboxBrigo(
        state,
        projectId(state),
        state.sandboxProjects![0].placements[0].id,
      ).inventory[BRIGO],
    ).toBe(1);
  });

  it("reste atomique si le retrait ou le démontage dépasserait la capacité", () => {
    let state = withPiece();
    state = placeSandboxBrigo(state, projectId(state), { ...CANDIDATE, x: 1 });
    state = { ...state, inventory: { [BRIGO]: MAX_VALUE - 1 } };
    const snapshot = structuredClone(state);
    expect(() => deleteSandboxProject(state, projectId(state))).toThrow(
      "plein",
    );
    expect(state).toEqual(snapshot);
    const full = { ...state, inventory: { [BRIGO]: MAX_VALUE } };
    expect(() =>
      removeSandboxBrigo(
        full,
        projectId(full),
        full.sandboxProjects![0].placements[0].id,
      ),
    ).toThrow("plein");
    expect(full.sandboxProjects![0].placements).toHaveLength(2);
  });

  it("limite le nombre de créations et de pièces sans supprimer les précédentes", () => {
    let state = createGame();
    for (let n = 0; n < SANDBOX_MAX_PROJECTS; n++)
      state = createSandboxProject(state);
    expect(() => createSandboxProject(state)).toThrow("20");
    const full = {
      ...stockedProject(),
      sandboxProjects: [
        {
          ...state.sandboxProjects![0],
          placements: Array.from({ length: SANDBOX_MAX_PLACEMENTS }, (_, n) =>
            piece({ x: n % 24, y: Math.floor(n / 24) }, `piece-${n}`),
          ),
        },
      ],
    };
    expect(() =>
      placeSandboxBrigo(full, projectId(full), { ...CANDIDATE, z: 6 }),
    ).toThrow("500");
    expect(full.inventory[BRIGO]).toBe(3);
  });

  it.each(["", "  ", "a".repeat(49), "ligne\nsuivante", "cache\u202eici"])(
    "refuse un nom incorrect : %j",
    (name) => {
      expect(() => createSandboxProject(createGame(), name)).toThrow("nom");
    },
  );

  it("accepte les anciens instantanés sans champ créatif et refuse les identifiants étrangers", () => {
    const { sandboxProjects: _absent, ...legacy } = createGame();
    expect(createSandboxProject(legacy).sandboxProjects).toHaveLength(1);
    expect(sandboxReservedCount(legacy)).toBe(0);
    expect(() => placeSandboxBrigo(legacy, "__proto__", CANDIDATE)).toThrow(
      "plus",
    );
    expect(() =>
      placeSandboxBrigo(stockedProject(), "absent", CANDIDATE),
    ).toThrow("plus");
    const state = stockedProject();
    expect(() =>
      placeSandboxBrigo(state, projectId(state), {
        ...CANDIDATE,
        brigoId: "__proto__",
      }),
    ).toThrow("existe");
  });
});

describe("placement créatif borné", () => {
  it("autorise les contacts et l’empilement mais pas les volumes superposés", () => {
    const placements = [piece()];
    expect(
      sandboxPlacementIssue(placements, { ...CANDIDATE, x: 1 }),
    ).toBeNull();
    expect(
      sandboxPlacementIssue(placements, { ...CANDIDATE, z: 3 }),
    ).toBeNull();
    expect(sandboxPlacementIssue(placements, { ...CANDIDATE, z: 2 })).toContain(
      "occupé",
    );
    expect(sandboxPlacementIssue(placements, CANDIDATE, "p-1")).toBeNull();
    expect(sandboxPlacementIssue([], { ...CANDIDATE, z: 20 })).toBeNull();
  });

  it("applique le volume conservateur aux arches et la rotation aux dimensions", () => {
    const arch = piece({ brigoId: "arch-1x6:coral" });
    expect(
      sandboxPlacementIssue([arch], { ...CANDIDATE, y: 2, z: 1 }),
    ).toContain("occupé");
    const long: SandboxCandidate = {
      ...CANDIDATE,
      brigoId: "brick-1x4:coral",
      x: 23,
      y: 20,
    };
    expect(sandboxPlacementIssue([], long)).toBeNull();
    expect(sandboxPlacementIssue([], { ...long, rotation: 90 })).toContain(
      "plateau",
    );
    expect(
      sandboxPlacementIssue([], { ...long, x: 20, y: 23, rotation: 90 }),
    ).toBeNull();
  });

  it.each([
    { x: -1 },
    { y: 24 },
    { z: -1 },
    { z: 34 },
    { x: 0.5 },
    { y: NaN },
    { z: Infinity },
    { rotation: 45 },
  ])("refuse les coordonnées incorrectes %j", (invalid) => {
    expect(
      sandboxPlacementIssue([], {
        ...CANDIDATE,
        ...invalid,
      } as SandboxCandidate),
    ).not.toBeNull();
  });

  it("calcule la hauteur au-dessus du sommet le plus haut et respecte le plafond", () => {
    const { z: _ignored, ...flat } = CANDIDATE;
    expect(sandboxAutoHeight([], flat)).toBe(0);
    expect(sandboxAutoHeight([piece(), piece({ z: 6 }, "p-2")], flat)).toBe(9);
    expect(sandboxAutoHeight([piece()], flat, "p-1")).toBe(0);
    expect(sandboxAutoHeight([piece({ z: 33 })], flat)).toBeNull();
    expect(sandboxAutoHeight([], { ...flat, x: 24 })).toBeNull();
    expect(sandboxAutoHeight([], { ...flat, brigoId: "__proto__" })).toBeNull();
  });
});
