import "fake-indexeddb/auto";
import { createHash } from "node:crypto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { describe, expect, it, vi } from "vitest";
import publishedV5 from "./fixtures/published-v5-digests.json";
import { CATALOG, RECIPES, RECIPE_BY_ID } from "./catalog";
import type { Recipe } from "./catalog";
import { createGame, MAX_VALUE, recipeProgress } from "./engine";
import { playerProgress, recipeXp } from "./progression";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { importSave, parseSave, parseSaveResult } from "./save";
import { connectRepository, SaveConflict } from "./storage";
import { V5_ASSEMBLIES, V5_RECIPE_SNAPSHOTS } from "./v5RecipeSnapshots";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const canonical = (values: unknown[][]) =>
  values.sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b), "en"),
  );
const canonicalObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalObject);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([key, child]) => [key, canonicalObject(child)]),
    );
  return value;
};
const geometryHash = (recipe: Recipe) =>
  hash(
    canonical(
      recipe.placements.map((p) => [
        p.modelId,
        p.colorId ?? null,
        p.x,
        p.y,
        p.z,
        p.rotation,
      ]),
    ),
  );
const materialsHash = (recipe: Recipe) =>
  hash(
    canonical(
      recipe.requirements.map((r) => [
        r.modelId ?? null,
        r.family ?? null,
        r.colorId ?? null,
        r.quantity,
      ]),
    ),
  );
const expectedRefund = (id: string) => {
  const current = RECIPE_BY_ID.get(id);
  const snapshot = publishedV5.find((recipe) => recipe.id === id)!;
  return (
    !current ||
    geometryHash(current) !== snapshot.geometry ||
    materialsHash(current) !== snapshot.materials
  );
};

function historicalSave(recipeId: string) {
  const recipe = clone(V5_RECIPE_SNAPSHOTS[recipeId]);
  const pieces = recipeProgress(
    {
      ...createGame(),
      inventory: Object.fromEntries(CATALOG.map((part) => [part.id, 100_000])),
    },
    recipe,
  ).pieces;
  return {
    ...createGame(),
    version: 5 as const,
    planRevision: 1 as const,
    coins: 2437,
    boxes: { discovery: 8, workshop: 4, prism: 2 },
    inventory: { "cone-6x6:green": 2, "brick-2x2:coral": 3 } as Record<
      string,
      number
    >,
    discovered: [
      ...new Set(["cone-6x6:green", "brick-2x2:coral", ...Object.keys(pieces)]),
    ],
    constructions: [
      {
        id: `v5-${recipeId}`,
        recipeId,
        createdAt: "2026-10-09T08:10:00.000Z",
        pieces,
      },
    ],
    goalRecipeId: recipeId as string | null,
    claimedAchievements: ["first-expert", "builder-variety"],
    lastVisitRewardAt: "2026-10-09T08:30:00.000Z",
    preferences: { sound: true, reducedMotion: true },
  };
}

function exactTotals(state: {
  inventory: Record<string, number>;
  constructions: { pieces: Record<string, number> }[];
}) {
  const totals = { ...state.inventory };
  for (const built of state.constructions)
    for (const [id, quantity] of Object.entries(built.pieces))
      totals[id] = (totals[id] ?? 0) + quantity;
  return totals;
}

function alterRecipe(id: string, edit: (recipe: Recipe) => void) {
  const previous = RECIPE_BY_ID.get(id);
  const revised = clone(V5_RECIPE_SNAPSHOTS[id]);
  edit(revised);
  RECIPE_BY_ID.set(id, revised);
  return () =>
    previous ? RECIPE_BY_ID.set(id, previous) : RECIPE_BY_ID.delete(id);
}

describe("migration sûre des 65 constructions publiées v5 vers les plans v6", () => {
  it("fige les noms, matériaux, clés et coordonnées de toutes les recettes originales", () => {
    expect(publishedV5).toHaveLength(65);
    expect(RECIPES.length).toBeGreaterThanOrEqual(65);
    expect(RECIPES.slice(0, 65).map((recipe) => recipe.id)).toEqual(
      publishedV5.map((recipe) => recipe.id),
    );
    expect(V5_ASSEMBLIES).toHaveLength(65);
    expect(Object.keys(V5_RECIPE_SNAPSHOTS)).toEqual(
      publishedV5.map((recipe) => recipe.id),
    );
    expect(
      V5_ASSEMBLIES.reduce((sum, recipe) => sum + recipe.placements.length, 0),
    ).toBe(13_643);
    for (const digest of publishedV5) {
      const snapshot = V5_RECIPE_SNAPSHOTS[digest.id];
      expect(hash(canonicalObject(snapshot)), digest.id).toBe(digest.content);
      expect(geometryHash(snapshot), digest.id).toBe(digest.geometry);
      expect(materialsHash(snapshot), digest.id).toBe(digest.materials);
    }
    const geometry = V5_RECIPE_SNAPSHOTS.totem.placements[0].x;
    const reusable = V5_ASSEMBLIES.find((recipe) => recipe.id === "totem")!;
    reusable.placements[0].x += 1;
    try {
      expect(V5_RECIPE_SNAPSHOTS.totem.placements[0].x).toBe(geometry);
    } finally {
      reusable.placements[0].x -= 1;
    }
  });

  it.each(publishedV5)(
    "valide historiquement et migre $id sans perdre une seule référence",
    ({ id }) => {
      const source = historicalSave(id);
      const before = clone(source);
      const refunded = CURRENT_SAVE_VERSION >= 6 && expectedRefund(id);
      const result = parseSaveResult(source);
      expect(result.state.version).toBe(CURRENT_SAVE_VERSION);
      expect(result.state.planRevision).toBe(1);
      expect(source).toEqual(before);
      expect(exactTotals(result.state)).toEqual(exactTotals(source));
      expect(result.state.constructions).toEqual(
        refunded ? [] : source.constructions,
      );
      expect(result.state.inventory).toEqual(
        refunded ? exactTotals(source) : source.inventory,
      );
      expect(result.migration?.refundedConstructions ?? 0).toBe(
        refunded ? 1 : 0,
      );
      expect(result.migration?.returnedPieces ?? 0).toBe(
        refunded
          ? Object.values(source.constructions[0].pieces).reduce(
              (sum, quantity) => sum + quantity,
              0,
            )
          : 0,
      );
      expect(playerProgress(result.state).xp).toBe(
        refunded ? 0 : recipeXp(RECIPE_BY_ID.get(id)!),
      );
      expect(result.state.goalRecipeId).toBe(RECIPE_BY_ID.has(id) ? id : null);
      for (const key of [
        "coins",
        "boxes",
        "discovered",
        "claimedAchievements",
        "lastVisitRewardAt",
        "preferences",
      ] as const)
        expect(result.state[key]).toEqual(source[key]);
      expect(parseSave(result.state)).toEqual(result.state);
      expect(parseSaveResult(result.state).migration).toBeUndefined();
    },
  );

  it("préserve un atelier réunissant les 65 identités et recalcule l’XP des créations conservées", () => {
    const saves = publishedV5.map(({ id }) => historicalSave(id));
    const source = {
      ...saves[0],
      goalRecipeId: null,
      discovered: [...new Set(saves.flatMap((saved) => saved.discovered))],
      constructions: saves.flatMap((saved) => saved.constructions),
    };
    const result = parseSaveResult(source);
    const kept = source.constructions.filter(
      (built) => CURRENT_SAVE_VERSION < 6 || !expectedRefund(built.recipeId),
    );
    expect(result.state.constructions).toEqual(kept);
    expect(exactTotals(result.state)).toEqual(exactTotals(source));
    expect(playerProgress(result.state).xp).toBe(
      kept.reduce(
        (sum, built) => sum + recipeXp(RECIPE_BY_ID.get(built.recipeId)!),
        0,
      ),
    );
    expect(result.state.claimedAchievements).toEqual(
      source.claimedAchievements,
    );
    expect(importSave(JSON.stringify(result.state))).toEqual(result.state);
  });

  it("ignore les changements de noms, descriptions, clés et ordre des pièces ou exigences", () => {
    const source = historicalSave("totem");
    const restore = alterRecipe("totem", (recipe) => {
      recipe.name = "Une autre présentation";
      recipe.description = "Texte corrigé";
      recipe.color = "#ffffff";
      recipe.theme = "objects";
      recipe.placements.reverse().forEach((part, index) => {
        part.key = `renamed-${index}`;
      });
      recipe.requirements.reverse().forEach((part) => {
        part.label = "Libellé corrigé";
      });
    });
    try {
      const result = parseSaveResult(source);
      expect(result.state.constructions).toEqual(source.constructions);
      expect(result.state.inventory).toEqual(source.inventory);
      expect(result.migration).toBeUndefined();
      expect(playerProgress(result.state).xp).toBe(
        recipeXp(V5_RECIPE_SNAPSHOTS.totem),
      );
    } finally {
      restore();
    }
  });

  it("ne retire que l’XP des créations modifiées et conserve chaque récompense acquise", () => {
    const totem = historicalSave("totem");
    const mosaic = historicalSave("mosaic");
    const restoreTotem = alterRecipe("totem", (recipe) => {
      recipe.placements[0].x += 1;
    });
    const restoreMosaic = alterRecipe("mosaic", () => {});
    try {
      const source = {
        ...totem,
        discovered: [...new Set([...totem.discovered, ...mosaic.discovered])],
        constructions: [...totem.constructions, ...mosaic.constructions],
      };
      const result = parseSaveResult(source);
      expect(result.state.constructions).toEqual(
        CURRENT_SAVE_VERSION >= 6 ? mosaic.constructions : source.constructions,
      );
      expect(playerProgress(result.state).xp).toBe(
        recipeXp(RECIPE_BY_ID.get("mosaic")!) +
          (CURRENT_SAVE_VERSION < 6 ? recipeXp(RECIPE_BY_ID.get("totem")!) : 0),
      );
      expect(result.state.claimedAchievements).toEqual(
        source.claimedAchievements,
      );
      expect(exactTotals(result.state)).toEqual(exactTotals(source));
    } finally {
      restoreTotem();
      restoreMosaic();
    }
  });

  it("un changement de caméra initiale seul conserve la création, ses Brigos et son XP", () => {
    const source = historicalSave("terraced-waterfall");
    const original = clone(source);
    const restore = alterRecipe("terraced-waterfall", (recipe) => {
      recipe.previewRotation = 270;
    });
    try {
      const result = parseSaveResult(source);
      expect(RECIPE_BY_ID.get("terraced-waterfall")!.previewRotation).toBe(270);
      expect(result.state.constructions).toEqual(source.constructions);
      expect(result.state.inventory).toEqual(source.inventory);
      expect(result.migration).toBeUndefined();
      expect(playerProgress(result.state).xp).toBe(
        recipeXp(V5_RECIPE_SNAPSHOTS["terraced-waterfall"]),
      );
      expect(result.state.claimedAchievements).toEqual(
        source.claimedAchievements,
      );
      expect(source).toEqual(original);
      expect(parseSaveResult(result.state).migration).toBeUndefined();
      expect(parseSave(result.state)).toEqual(result.state);
    } finally {
      restore();
    }
  });

  it("restitue les couleurs exactes lorsqu’une contrainte matérielle change sans changer la géométrie", () => {
    const source = historicalSave("totem");
    source.constructions[0].pieces = {
      "brick-2x2:mint": 2,
      "brick-2x2:blue": 3,
    };
    source.discovered.push("brick-2x2:mint", "brick-2x2:blue");
    source.discovered = [...new Set(source.discovered)];
    const restore = alterRecipe("totem", (recipe) => {
      recipe.requirements[0].colorId = "coral";
    });
    try {
      const result = parseSaveResult(source);
      expect(exactTotals(result.state)).toEqual(exactTotals(source));
      expect(result.state.inventory["brick-2x2:mint"] ?? 0).toBe(
        CURRENT_SAVE_VERSION >= 6 ? 2 : 0,
      );
      expect(result.state.inventory["brick-2x2:blue"] ?? 0).toBe(
        CURRENT_SAVE_VERSION >= 6 ? 3 : 0,
      );
    } finally {
      restore();
    }
  });

  it("valide l’ancien inventaire contre le snapshot avant toute restitution", () => {
    const source = historicalSave("totem");
    const restore = alterRecipe("totem", (recipe) => {
      recipe.placements[0].x += 1;
    });
    source.constructions[0].pieces = { "brick-1x1:coral": 5 };
    source.discovered.push("brick-1x1:coral");
    try {
      expect(() => parseSave(source)).toThrow("incompatibles");
    } finally {
      restore();
    }
  });

  it("restitue une identité retirée et efface seulement son objectif devenu indisponible", () => {
    if (CURRENT_SAVE_VERSION < 6) return;
    const source = historicalSave("totem");
    const previous = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      const result = parseSaveResult(source);
      expect(result.state.constructions).toEqual([]);
      expect(result.state.inventory).toEqual(exactTotals(source));
      expect(result.state.goalRecipeId).toBeNull();
      expect(result.migration).toEqual({
        refundedConstructions: 1,
        returnedPieces: 5,
        clearedGoal: true,
      });
      expect(playerProgress(result.state).xp).toBe(0);
      expect(result.state.claimedAchievements).toEqual(
        source.claimedAchievements,
      );
      expect(parseSaveResult(result.state).migration).toBeUndefined();
    } finally {
      if (previous) RECIPE_BY_ID.set("totem", previous);
    }
  });

  it("refuse les nouveaux identifiants injectés dans une sauvegarde v5", () => {
    const source = historicalSave("totem");
    const injected = {
      ...clone(V5_RECIPE_SNAPSHOTS.totem),
      id: "injected-v6-plan",
    };
    RECIPE_BY_ID.set(injected.id, injected);
    try {
      expect(() =>
        parseSave({
          ...source,
          constructions: [
            { ...source.constructions[0], recipeId: injected.id },
          ],
        }),
      ).toThrow("construction inconnue");
      expect(() =>
        parseSave({ ...source, constructions: [], goalRecipeId: injected.id }),
      ).toThrow("objectif inconnu");
    } finally {
      RECIPE_BY_ID.delete(injected.id);
    }
  });

  it("garde une ouverture historique de cinq cartes sans crédit supplémentaire pendant la migration", () => {
    const source = historicalSave("totem");
    const opening = {
      id: "saved-five-cards",
      boxId: "discovery",
      createdAt: "2026-10-09T09:00:00.000Z",
      drops: Array.from({ length: 5 }, () => ({
        brigoId: "cone-6x6:green",
        isNew: false,
      })),
    };
    const result = parseSave({
      ...source,
      history: [opening],
      pendingOpening: opening,
      boxesOpened: 1,
    });
    expect(result.history).toEqual([opening]);
    expect(result.pendingOpening).toEqual(opening);
    expect(result.boxesOpened).toBe(1);
    expect(result.inventory["cone-6x6:green"]).toBe(2);
    expect(parseSave(result)).toEqual(result);
  });

  it.each([undefined, null, 0, 2, "1"])(
    "rejette une révision v6 incompatible %j",
    (planRevision) => {
      expect(() =>
        parseSave({ ...createGame(), version: 6, planRevision }),
      ).toThrow(CURRENT_SAVE_VERSION >= 6 ? "révision" : "version");
    },
  );

  it("restitue une galerie de mille exemplaires une seule fois", () => {
    const source = historicalSave("totem");
    source.constructions = Array.from({ length: 1000 }, (_, index) => ({
      ...source.constructions[0],
      id: `old-totem-${index}`,
    }));
    const restore = alterRecipe("totem", (recipe) => {
      recipe.placements[0].x += 1;
    });
    try {
      const result = parseSaveResult(source);
      expect(exactTotals(result.state)).toEqual(exactTotals(source));
      expect(result.migration?.returnedPieces ?? 0).toBe(
        CURRENT_SAVE_VERSION >= 6 ? 5000 : 0,
      );
      expect(result.state.constructions.length).toBe(
        CURRENT_SAVE_VERSION >= 6 ? 0 : 1000,
      );
      expect(parseSaveResult(result.state).migration).toBeUndefined();
      expect(parseSave(result.state)).toEqual(result.state);
    } finally {
      restore();
    }
  });

  it("la bascule unique en mode5 garde exactement les 65 anciens plans et refuse les saves v6", async () => {
    vi.resetModules();
    vi.doMock("./releaseVersion", () => ({ CURRENT_SAVE_VERSION: 5 }));
    try {
      const [catalog, engine, save] = await Promise.all([
        import("./catalog"),
        import("./engine"),
        import("./save"),
      ]);
      expect(engine.createGame().version).toBe(5);
      expect(catalog.RECIPES).toEqual(Object.values(V5_RECIPE_SNAPSHOTS));
      const source = historicalSave("totem");
      expect(save.parseSaveResult(source).state).toEqual(source);
      expect(save.parseSaveResult(source).migration).toBeUndefined();
      expect(() => save.parseSave({ ...source, version: 6 })).toThrow(
        "version plus récente",
      );
    } finally {
      vi.doUnmock("./releaseVersion");
      vi.resetModules();
    }
  });
});

describe("persistance atomique de la migration v5", () => {
  it("deux onglets ne peuvent ni doubler la restitution ni réécrire avec une révision périmée", async () => {
    globalThis.indexedDB = new IDBFactory();
    const first = await connectRepository();
    const second = await connectRepository();
    const database = await openDB("brigo-club", 1);
    const source = historicalSave("totem");
    const restore = alterRecipe("totem", (recipe) => {
      recipe.placements[0].x += 1;
    });
    try {
      await database.put("saves", { revision: 24, state: source }, "player");
      const loads = await Promise.all([first.load(), second.load()]);
      const expectedRevision = CURRENT_SAVE_VERSION >= 6 ? 25 : 24;
      expect(loads.filter((loaded) => loaded.migration)).toHaveLength(
        CURRENT_SAVE_VERSION >= 6 ? 1 : 0,
      );
      for (const loaded of loads) {
        expect(loaded.revision).toBe(expectedRevision);
        expect(exactTotals(loaded.state)).toEqual(exactTotals(source));
        expect(loaded.state.claimedAchievements).toEqual(
          source.claimedAchievements,
        );
      }
      expect((await first.load()).migration).toBeUndefined();
      if (CURRENT_SAVE_VERSION >= 6)
        await expect(first.commit(createGame(), 24)).rejects.toBeInstanceOf(
          SaveConflict,
        );
      const persisted = await database.get("saves", "player");
      expect(persisted.revision).toBe(expectedRevision);
      expect(persisted.state).toEqual(loads[0].state);
    } finally {
      restore();
      first.close();
      second.close();
      database.close();
    }
  });

  it("une révision seule est enregistrée même quand aucun plan n’a changé", async () => {
    globalThis.indexedDB = new IDBFactory();
    const repository = await connectRepository();
    const database = await openDB("brigo-club", 1);
    const source = historicalSave("totem");
    const restore = alterRecipe("totem", () => {});
    try {
      await database.put("saves", { revision: 8, state: source }, "player");
      const loaded = await repository.load();
      expect(loaded.revision).toBe(CURRENT_SAVE_VERSION >= 6 ? 9 : 8);
      expect(loaded.state.version).toBe(CURRENT_SAVE_VERSION);
      expect(loaded.state.constructions).toEqual(source.constructions);
      expect(loaded.migration).toBeUndefined();
      expect((await repository.load()).revision).toBe(loaded.revision);
    } finally {
      restore();
      repository.close();
      database.close();
    }
  });

  it("préserve la sauvegarde brute si les pièces restituées dépassent la capacité", async () => {
    if (CURRENT_SAVE_VERSION < 6) return;
    globalThis.indexedDB = new IDBFactory();
    const repository = await connectRepository();
    const database = await openDB("brigo-club", 1);
    const source = historicalSave("totem");
    const refundId = Object.keys(source.constructions[0].pieces)[0];
    source.inventory[refundId] = MAX_VALUE;
    const original = clone(source);
    const restore = alterRecipe("totem", (recipe) => {
      recipe.placements[0].x += 1;
    });
    try {
      expect(() => parseSave(source)).toThrow("limite d’inventaire");
      expect(source).toEqual(original);
      await database.put("saves", { revision: 7, state: source }, "player");
      await expect(repository.load()).rejects.toThrow("limite d’inventaire");
      expect(await database.get("saves", "player")).toEqual({
        revision: 7,
        state: original,
      });
    } finally {
      restore();
      repository.close();
      database.close();
    }
  });

  it("une construction v5 corrompue reste intacte en base et n’est jamais remboursée", async () => {
    globalThis.indexedDB = new IDBFactory();
    const repository = await connectRepository();
    const database = await openDB("brigo-club", 1);
    const source = historicalSave("totem");
    source.constructions[0].pieces = { "brick-1x1:coral": 5 };
    source.discovered.push("brick-1x1:coral");
    try {
      await database.put("saves", { revision: 14, state: source }, "player");
      await expect(repository.load()).rejects.toThrow("incompatibles");
      expect(await database.get("saves", "player")).toEqual({
        revision: 14,
        state: source,
      });
    } finally {
      repository.close();
      database.close();
    }
  });
});
