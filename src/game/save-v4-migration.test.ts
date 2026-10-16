import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { CATALOG, RECIPES, RECIPE_BY_ID } from "./catalog";
import type { Recipe } from "./catalog";
import type { AssemblyPlacement } from "./assemblies";
import {
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
  recipeProgress,
} from "./engine";
import { playerProgress, recipeXp } from "./progression";
import { importSave, parseSave, parseSaveResult } from "./save";
import { connectRepository, SaveConflict } from "./storage";
import { V4_RECIPE_SNAPSHOTS } from "./v4RecipeSnapshots";
import type { V4RecipeSnapshot } from "./v4RecipeSnapshots";

const snapshots: Readonly<Record<string, V4RecipeSnapshot>> =
  V4_RECIPE_SNAPSHOTS;

function historicalRecipe(recipeId: string): Recipe {
  const snapshot = snapshots[recipeId];
  const tuples = JSON.parse(snapshot.geometry) as [
    string,
    AssemblyPlacement["colorId"] | null,
    number,
    number,
    number,
    AssemblyPlacement["rotation"],
  ][];
  return {
    id: recipeId,
    name: snapshot.name,
    description: "Plan v4 figé",
    difficulty: "Premiers pas",
    color: "#ffffff",
    requirements: snapshot.requirements.map((r) => ({ ...r })),
    placements: tuples.map(([modelId, colorId, x, y, z, rotation], index) => ({
      key: `old-${index}`,
      modelId,
      ...(colorId ? { colorId } : {}),
      x,
      y,
      z,
      rotation,
    })),
  };
}

function historicalSave(recipeId: string) {
  const pieces = recipeProgress(
    {
      ...createGame(),
      inventory: Object.fromEntries(CATALOG.map((part) => [part.id, 1000])),
    },
    historicalRecipe(recipeId),
  ).pieces;
  return {
    ...createGame(),
    version: 4,
    planRevision: 1,
    coins: 2437,
    boxes: { discovery: 8, workshop: 4, prism: 2 },
    inventory: { "cone-6x6:green": 2, "brick-2x2:coral": 3 },
    discovered: [
      ...new Set(["cone-6x6:green", "brick-2x2:coral", ...Object.keys(pieces)]),
    ],
    constructions: [
      {
        id: `v4-${recipeId}`,
        recipeId,
        createdAt: "2026-10-09T00:10:00.000Z",
        pieces,
      },
    ],
    goalRecipeId: recipeId,
    claimedAchievements: ["first-expert", "builder-variety"],
    lastVisitRewardAt: "2026-10-09T00:30:00.000Z",
    preferences: { sound: true, reducedMotion: true },
  };
}

const geometry = (recipe: Recipe) =>
  JSON.stringify(
    recipe.placements
      .map((p) => [p.modelId, p.colorId ?? null, p.x, p.y, p.z, p.rotation])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en")),
  );

const materialSignature = (requirements: Recipe["requirements"]) =>
  JSON.stringify(
    requirements
      .map((r) => [
        r.modelId ?? null,
        r.family ?? null,
        r.colorId ?? null,
        r.quantity,
      ])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en")),
  );

const restoreRecipe = (recipeId: string, recipe: Recipe | undefined) => {
  if (recipe) RECIPE_BY_ID.set(recipeId, recipe);
  else RECIPE_BY_ID.delete(recipeId);
};

describe("migration des plans publiés en v4 vers la v5", () => {
  it("garde l’instantané indépendant des quarante-deux plans et de leurs 789 pièces", () => {
    expect(Object.keys(snapshots)).toHaveLength(42);
    expect(
      Object.values(snapshots).reduce(
        (sum, recipe) => sum + JSON.parse(recipe.geometry).length,
        0,
      ),
    ).toBe(789);
  });

  it.each(Object.keys(snapshots))(
    "migre le plan v4 %s en conservant chaque référence et chaque récompense",
    (recipeId) => {
      const source = historicalSave(recipeId);
      const before = JSON.parse(JSON.stringify(source));
      const current = RECIPE_BY_ID.get(recipeId);
      const expectedRefund =
        !current ||
        geometry(current) !== snapshots[recipeId].geometry ||
        materialSignature(current.requirements) !==
          materialSignature(historicalRecipe(recipeId).requirements);
      const { state, migration } = parseSaveResult(source);
      expect(state.version).toBe(CURRENT_SAVE_VERSION);
      expect(state.planRevision).toBe(1);
      expect(source).toEqual(before);
      if (expectedRefund) {
        const expected = { ...source.inventory } as Record<string, number>;
        for (const [id, count] of Object.entries(
          source.constructions[0].pieces,
        ))
          expected[id] = (expected[id] ?? 0) + count;
        expect(state.inventory).toEqual(expected);
        expect(state.constructions).toEqual([]);
        expect(migration?.refundedConstructions).toBe(1);
        expect(migration?.returnedPieces).toBe(
          Object.values(source.constructions[0].pieces).reduce(
            (a, b) => a + b,
            0,
          ),
        );
      } else {
        expect(state.inventory).toEqual(source.inventory);
        expect(state.constructions).toEqual(source.constructions);
        expect(migration).toBeUndefined();
      }
      expect(state.goalRecipeId).toBe(current ? recipeId : null);
      expect(state.coins).toBe(source.coins);
      expect(state.boxes).toEqual(source.boxes);
      expect(state.discovered).toEqual(source.discovered);
      expect(state.claimedAchievements).toEqual(source.claimedAchievements);
      expect(state.lastVisitRewardAt).toBe(source.lastVisitRewardAt);
      expect(state.preferences).toEqual(source.preferences);
      expect(parseSave(state)).toEqual(state);
      expect(parseSaveResult(state).migration).toBeUndefined();
    },
  );

  it("préserve les références de cônes dans l’inventaire, l’album et l’ouverture en cours", () => {
    const source = historicalSave("tree");
    const opening = {
      id: "cone-opening",
      boxId: "discovery",
      createdAt: "2026-10-09T01:00:00.000Z",
      drops: Array.from({ length: 5 }, () => ({
        brigoId: "cone-6x6:green",
        isNew: false,
      })),
    };
    const parsed = parseSave({
      ...source,
      history: [opening],
      pendingOpening: opening,
      boxesOpened: 1,
    });
    expect(parsed.discovered).toEqual(source.discovered);
    expect(parsed.inventory["cone-6x6:green"]).toBeGreaterThanOrEqual(2);
    expect(parsed.history).toEqual([opening]);
    expect(parsed.pendingOpening).toEqual(opening);
    expect(parsed.boxesOpened).toBe(1);
    expect(parseSave(parsed)).toEqual(parsed);
  });

  it("conserve toutes les variantes de cônes archivés quelle que soit leur couleur", () => {
    const references = CATALOG.filter((brigo) =>
      brigo.model.id.startsWith("cone-"),
    );
    expect(references.length).toBeGreaterThanOrEqual(30);
    const inventory = Object.fromEntries(
      references.map((brigo, index) => [brigo.id, index + 1]),
    );
    const discovered = references.map((brigo) => brigo.id);
    const parsed = parseSave({
      ...createGame(),
      version: 4,
      inventory,
      discovered,
    });
    expect(parsed.inventory).toEqual(inventory);
    expect(parsed.discovered).toEqual(discovered);
    expect(parseSave(parsed)).toEqual(parsed);
  });

  it("rend les cônes exacts de l’ancien sapin sans les convertir en nouvelles briques", () => {
    const source = historicalSave("tree");
    const current = RECIPE_BY_ID.get("tree");
    RECIPE_BY_ID.delete("tree");
    try {
      const parsed = parseSave(source);
      expect(parsed.constructions).toEqual([]);
      expect(parsed.goalRecipeId).toBeNull();
      expect(parsed.inventory["cone-6x6:green"]).toBe(3);
      expect(parsed.inventory["cone-4x4:green"]).toBe(1);
      expect(parsed.inventory["cone-2x2:green"]).toBe(1);
      expect(parsed.inventory["round-2x2:brown"]).toBe(3);
      expect(parsed.inventory["plate-4x4:ivory"]).toBe(1);
      expect(playerProgress(parsed).xp).toBe(0);
      expect(parsed.claimedAchievements).toEqual(source.claimedAchievements);
    } finally {
      restoreRecipe("tree", current);
    }
  });

  it("ne retire que l’XP de la création révisée et préserve la création inchangée", () => {
    const tree = historicalSave("tree");
    const totem = historicalSave("totem");
    const currentTree = RECIPE_BY_ID.get("tree");
    const currentTotem = RECIPE_BY_ID.get("totem");
    const revised = historicalRecipe("tree");
    revised.placements[0].x += 1;
    RECIPE_BY_ID.set("tree", revised);
    RECIPE_BY_ID.set("totem", historicalRecipe("totem"));
    try {
      const parsed = parseSave({
        ...tree,
        discovered: [...new Set([...tree.discovered, ...totem.discovered])],
        constructions: [...tree.constructions, ...totem.constructions],
      });
      expect(parsed.constructions).toEqual(totem.constructions);
      expect(playerProgress(parsed).xp).toBe(
        recipeXp(historicalRecipe("totem")),
      );
      expect(parsed.claimedAchievements).toEqual(tree.claimedAchievements);
    } finally {
      restoreRecipe("tree", currentTree);
      restoreRecipe("totem", currentTotem);
    }
  });

  it("rejette les matériaux v4 falsifiés avant de restituer un ancien plan", () => {
    const source = historicalSave("tree");
    const current = RECIPE_BY_ID.get("tree");
    RECIPE_BY_ID.delete("tree");
    try {
      expect(() =>
        parseSave({
          ...source,
          constructions: [
            { ...source.constructions[0], pieces: { "brick-2x2:coral": 7 } },
          ],
        }),
      ).toThrow("incompatibles");
    } finally {
      restoreRecipe("tree", current);
    }
  });

  it("refuse un plan nouvellement inventé dans une sauvegarde v4", () => {
    const recipe = { ...historicalRecipe("totem"), id: "legendary-injected" };
    RECIPE_BY_ID.set(recipe.id, recipe);
    try {
      const source = historicalSave("totem");
      expect(() =>
        parseSave({
          ...source,
          constructions: [{ ...source.constructions[0], recipeId: recipe.id }],
        }),
      ).toThrow("inconnue");
      expect(() =>
        parseSave({ ...source, constructions: [], goalRecipeId: recipe.id }),
      ).toThrow("objectif");
    } finally {
      RECIPE_BY_ID.delete(recipe.id);
    }
  });

  it.each([undefined, null, 0, 2, "1"])(
    "refuse une v5 sans révision compatible (%j)",
    (planRevision) => {
      expect(() =>
        parseSave({ ...createGame(), version: 5, planRevision }),
      ).toThrow("révision");
    },
  );

  it("préserve la sauvegarde source si une restitution v4 dépasse la capacité", () => {
    const source = historicalSave("tree");
    source.inventory["cone-6x6:green"] = 10_000_000;
    const before = JSON.parse(JSON.stringify(source));
    const current = RECIPE_BY_ID.get("tree");
    RECIPE_BY_ID.delete("tree");
    try {
      expect(() => parseSave(source)).toThrow("limite d’inventaire");
      expect(source).toEqual(before);
    } finally {
      restoreRecipe("tree", current);
    }
  });

  it("conserve toutes les références d’un atelier contenant les 42 plans v4", () => {
    const saves = Object.keys(snapshots).map(historicalSave);
    const source = {
      ...saves[0],
      goalRecipeId: null,
      discovered: [...new Set(saves.flatMap((saved) => saved.discovered))],
      constructions: saves.flatMap((saved) => saved.constructions),
    };
    const totals = (state: {
      inventory: Record<string, number>;
      constructions: { pieces: Record<string, number> }[];
    }) => {
      const result = { ...state.inventory };
      for (const built of state.constructions)
        for (const [id, quantity] of Object.entries(built.pieces))
          result[id] = (result[id] ?? 0) + quantity;
      return result;
    };
    const parsed = parseSave(source);
    expect(totals(parsed)).toEqual(totals(source));
    expect(parseSave(parsed)).toEqual(parsed);
  });

  it("restitue intégralement un atelier rempli de mille copies d’un ancien plan", () => {
    const source = historicalSave("tree");
    source.constructions = Array.from({ length: 1000 }, (_, index) => ({
      ...source.constructions[0],
      id: `v4-tree-${index}`,
    }));
    const current = RECIPE_BY_ID.get("tree");
    RECIPE_BY_ID.delete("tree");
    try {
      const { state, migration } = parseSaveResult(source);
      expect(state.constructions).toEqual([]);
      expect(state.inventory["cone-6x6:green"]).toBe(1002);
      expect(state.inventory["cone-4x4:green"]).toBe(1000);
      expect(state.inventory["round-2x2:brown"]).toBe(3000);
      expect(migration?.refundedConstructions).toBe(1000);
      expect(migration?.returnedPieces).toBe(7000);
      expect(parseSave(state)).toEqual(state);
    } finally {
      restoreRecipe("tree", current);
    }
  });

  it("sauvegarde et restitue intégralement les nouveaux plans de plus de mille pièces", () => {
    const largeRecipes = RECIPES.filter(
      (recipe) => recipe.placements.length >= 1000,
    );
    expect(largeRecipes.length).toBeGreaterThan(0);
    for (const recipe of largeRecipes) {
      const supplied = adminCommand(
        createGame(),
        { type: "recipe", recipeId: recipe.id },
        true,
      );
      const assembled = buildRecipe(supplied, recipe.id);
      const restored = importSave(JSON.stringify(assembled));
      expect(restored).toEqual(assembled);
      expect(
        Object.values(restored.constructions[0].pieces).reduce(
          (a, b) => a + b,
          0,
        ),
      ).toBe(recipe.placements.length);
      expect(
        dismantle(restored, restored.constructions[0].id).inventory,
      ).toEqual(supplied.inventory);
    }
  });

  it("migre une v4 dans deux onglets en ne restituant les cônes qu’une fois", async () => {
    globalThis.indexedDB = new IDBFactory();
    const first = await connectRepository();
    const second = await connectRepository();
    const db = await openDB("brigo-club", 1);
    const source = historicalSave("tree");
    const current = RECIPE_BY_ID.get("tree");
    RECIPE_BY_ID.delete("tree");
    try {
      await db.put("saves", { revision: 18, state: source }, "player");
      const loads = await Promise.all([first.load(), second.load()]);
      expect(loads.filter((loaded) => loaded.migration)).toHaveLength(1);
      for (const loaded of loads) {
        expect(loaded.revision).toBe(19);
        expect(loaded.state.version).toBe(CURRENT_SAVE_VERSION);
        expect(loaded.state.inventory["cone-6x6:green"]).toBe(3);
        expect(loaded.state.claimedAchievements).toEqual(
          source.claimedAchievements,
        );
      }
      expect((await first.load()).migration).toBeUndefined();
      await expect(first.commit(createGame(), 18)).rejects.toBeInstanceOf(
        SaveConflict,
      );
      expect((await second.load()).state.inventory["cone-6x6:green"]).toBe(3);
    } finally {
      restoreRecipe("tree", current);
      first.close();
      second.close();
      db.close();
    }
  });
});
