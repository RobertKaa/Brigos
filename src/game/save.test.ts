import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { describe, expect, it } from "vitest";
import { BOXES, BOX_DROP_COUNT, CATALOG, RECIPE_BY_ID } from "./catalog";
import type { Recipe } from "./catalog";
import type { AssemblyPlacement } from "./assemblies";
import {
  adminCommand,
  buildRecipe,
  createGame,
  finishOpening,
  openBox,
  openNextBox,
  recipeProgress,
} from "./engine";
import { importSave, parseSave, parseSaveResult } from "./save";
import { V3_RECIPE_SNAPSHOTS } from "./v3RecipeSnapshots";
import type { RecipeSnapshot } from "./v3RecipeSnapshots";
import {
  LEGACY_REQUIREMENTS,
  V2_RECIPE_IDS,
  V2_TREE_REQUIREMENTS,
} from "./legacyRecipes";

const historicalRecipes: Readonly<Record<string, RecipeSnapshot>> =
  V3_RECIPE_SNAPSHOTS;

function historicalRecipe(recipeId: string): Recipe {
  const snapshot = historicalRecipes[recipeId];
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
    description: "Plan v3 figé",
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

function v3ConstructionSave(recipeId: string) {
  const pieces = recipeProgress(
    {
      ...createGame(),
      inventory: Object.fromEntries(CATALOG.map((part) => [part.id, 1000])),
    },
    historicalRecipe(recipeId),
  ).pieces;
  return {
    ...createGame(),
    version: 3,
    coins: 1783,
    boxes: { discovery: 7, workshop: 2, prism: 1 },
    inventory: { "brick-2x2:coral": 3 },
    discovered: [...new Set(["brick-2x2:coral", ...Object.keys(pieces)])],
    constructions: [
      {
        id: `v3-${recipeId}`,
        recipeId,
        createdAt: "2026-10-01T12:00:00.000Z",
        pieces,
      },
    ],
    goalRecipeId: recipeId,
    claimedAchievements: ["first-expert"],
    lastVisitRewardAt: "2026-10-08T08:00:00.000Z",
    preferences: { sound: true, reducedMotion: true },
  };
}

const canonicalGeometry = (recipe: Recipe) =>
  JSON.stringify(
    recipe.placements
      .map((p) => [p.modelId, p.colorId ?? null, p.x, p.y, p.z, p.rotation])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en")),
  );

describe("sauvegardes et import sécurisé", () => {
  it("conserve sans perte une partie neuve et une partie complète", () => {
    expect(importSave(JSON.stringify(createGame()))).toEqual(createGame());
    let state = adminCommand(
      createGame(),
      { type: "catalog", amount: 10 },
      true,
    );
    state = adminCommand(state, { type: "recipe", recipeId: "tree" }, true);
    state = buildRecipe(state, "tree");
    state = openBox(state, "discovery", { random: () => 0.99 });
    expect(importSave(JSON.stringify(state))).toEqual(state);
    expect(importSave(JSON.stringify(finishOpening(state)))).toEqual(
      finishOpening(state),
    );
  });
  it("restaure une ouverture en cours sans créditer de nouveaux Brigos", () => {
    const state = openBox(createGame(), "discovery", { random: () => 0 });
    const restored = parseSave(JSON.parse(JSON.stringify(state)));
    expect(restored.pendingOpening).toEqual(state.pendingOpening);
    expect(restored.inventory).toEqual(state.inventory);
    expect(() => openBox(restored, "discovery")).toThrow("en cours");
  });
  it("conserve exactement une ancienne boîte de cinq puis enchaîne avec dix nouveaux Brigos", () => {
    const brigoId = "brick-1x1:coral";
    const opening = {
      id: "legacy-five",
      boxId: "discovery" as const,
      createdAt: "2026-10-08T08:00:00.000Z",
      drops: Array.from({ length: 5 }, (_, index) => ({
        brigoId,
        isNew: index === 0,
      })),
    };
    const source = {
      ...createGame(),
      inventory: { [brigoId]: 5 },
      discovered: [brigoId],
      boxes: { discovery: 2, workshop: 0, prism: 0 },
      boxesOpened: 1,
      history: [opening],
      pendingOpening: opening,
    };
    const restored = importSave(JSON.stringify(source));
    expect(restored).toEqual(source);
    expect(parseSaveResult(restored).migration).toBeUndefined();
    const next = openNextBox(restored, "discovery", { random: () => 0 });
    expect(next.history.map((item) => item.drops.length)).toEqual([10, 5]);
    expect(next.inventory[brigoId]).toBe(15);
    expect(next.boxes.discovery).toBe(1);
    expect(next.coins).toBe(1200);
    expect(importSave(JSON.stringify(next))).toEqual(next);
    expect(finishOpening(parseSave(next)).inventory[brigoId]).toBe(15);
    expect(restored).toEqual(source);
  });
  it.each([1, 2, 3, 4, 5])(
    "préserve les cinq cartes, l’inventaire et le stock d’une sauvegarde v%i",
    (version) => {
      const brigoId = "brick-1x1:coral";
      const opening = {
        id: `legacy-v${version}`,
        boxId: "workshop" as const,
        createdAt: "2026-10-08T08:00:00.000Z",
        drops: Array.from({ length: 5 }, (_, index) => ({
          brigoId,
          isNew: index === 0,
        })),
      };
      const source = {
        ...createGame(),
        version,
        coins: 950,
        inventory: { [brigoId]: 5 },
        discovered: [brigoId],
        boxesOpened: 1,
        history: [opening],
        pendingOpening: opening,
      };
      const before = structuredClone(source);
      const restored = importSave(JSON.stringify(source));
      expect(restored.version).toBe(CURRENT_SAVE_VERSION);
      expect(restored.pendingOpening).toEqual(opening);
      expect(restored.history).toEqual([opening]);
      expect(restored.inventory).toEqual(source.inventory);
      expect(restored.discovered).toEqual(source.discovered);
      expect(restored.coins).toBe(950);
      expect(restored.boxes).toEqual(source.boxes);
      expect(restored.boxesOpened).toBe(1);
      expect(parseSave(restored)).toEqual(restored);
      expect(source).toEqual(before);
    },
  );
  it("conserve la mention de tirage forcé après rechargement", () => {
    const state = openBox(createGame(), "discovery", {
      forcedRarity: "legendary",
      adminEnabled: true,
      random: () => 0,
    });
    expect(parseSave(state).history[0].testRarity).toBe("legendary");
  });
  it.each([null, [], {}, "brigo", { ...createGame(), version: 999 }])(
    "refuse un format ou une version non pris en charge (%j)",
    (value) => {
      expect(() => parseSave(value)).toThrow("Sauvegarde invalide");
    },
  );
  it.each([-1, 1.1, Infinity, NaN, 10_000_001, "1200"])(
    "refuse un solde incorrect (%s)",
    (coins) => {
      expect(() => parseSave({ ...createGame(), coins })).toThrow("quantité");
    },
  );
  it("rejette les références inconnues et les clés de pollution de prototype", () => {
    const text = JSON.stringify(createGame()).replace(
      '"inventory":{}',
      '"inventory":{"__proto__":{"polluted":true}}',
    );
    expect(() => importSave(text)).toThrow("Brigo inconnu");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("rejette les découvertes en double et les inventaires qui ne figurent pas dans l’album", () => {
    expect(() =>
      parseSave({
        ...createGame(),
        discovered: ["brick-1x1:coral", "brick-1x1:coral"],
      }),
    ).toThrow("double");
    expect(() =>
      parseSave({ ...createGame(), inventory: { "brick-1x1:coral": 1 } }),
    ).toThrow("album");
  });
  it("rejette les constructions inconnues, incohérentes ou dupliquées", () => {
    const built = buildRecipe(
      adminCommand(createGame(), { type: "recipe", recipeId: "totem" }, true),
      "totem",
    );
    expect(() =>
      parseSave({
        ...built,
        constructions: [{ ...built.constructions[0], recipeId: "intrus" }],
      }),
    ).toThrow("inconnue");
    expect(() =>
      parseSave({
        ...built,
        constructions: [
          { ...built.constructions[0], pieces: { "brick-1x1:coral": 6 } },
        ],
      }),
    ).toThrow("incompatibles");
    expect(() =>
      parseSave({
        ...built,
        constructions: [built.constructions[0], built.constructions[0]],
      }),
    ).toThrow("double");
  });
  it("refuse une boîte avec un nombre de Brigos incorrect et un historique incohérent", () => {
    const opened = openBox(createGame(), "discovery", { random: () => 0 });
    expect(() =>
      parseSave({
        ...opened,
        history: [
          { ...opened.history[0], drops: opened.history[0].drops.slice(1) },
        ],
      }),
    ).toThrow("cinq");
    expect(() => parseSave({ ...opened, boxesOpened: 0 })).toThrow(
      "incohérent",
    );
    expect(() =>
      parseSave({
        ...opened,
        pendingOpening: { ...opened.pendingOpening, id: "unknown" },
      }),
    ).toThrow("en cours");
  });
  it.each([0, 1, 4, 6, 7, 8, 9, 11, 100])(
    "refuse un historique contenant une boîte de %i cartes sans modifier l’objet source",
    (count) => {
      const opened = openBox(createGame(), "discovery", { random: () => 0 });
      const invalid = {
        ...opened,
        history: [
          {
            ...opened.history[0],
            drops: Array.from({ length: count }, () => ({
              brigoId: "brick-1x1:coral",
              isNew: false,
            })),
          },
        ],
      };
      const before = structuredClone(invalid);
      expect(() => parseSave(invalid)).toThrow("Sauvegarde invalide");
      expect(invalid).toEqual(before);
    },
  );
  it("refuse une ouverture en cours de cinq cartes substituée à un historique de dix", () => {
    const opened = openBox(createGame(), "discovery", { random: () => 0 });
    expect(opened.pendingOpening!.drops).toHaveLength(BOX_DROP_COUNT);
    expect(() =>
      parseSave({
        ...opened,
        pendingOpening: {
          ...opened.pendingOpening,
          drops: opened.pendingOpening!.drops.slice(0, 5),
        },
      }),
    ).toThrow("en cours incohérente");
  });
  it("vérifie chaque nouvelle carte et ignore les propriétés injectées dans les dix résultats", () => {
    const opened = openBox(createGame(), "discovery", { random: () => 0 });
    for (const changes of [
      { brigoId: "__proto__" },
      { brigoId: "intrus" },
      { isNew: "true" },
    ]) {
      const modified = structuredClone(opened);
      Object.assign(modified.history[0].drops[9], changes);
      expect(() => parseSave(modified)).toThrow("Sauvegarde invalide");
    }
    const injected = structuredClone(opened);
    Object.assign(injected.history[0].drops[9], {
      html: "<script>alert(1)</script>",
      isAdmin: true,
    });
    const restored = parseSave(injected);
    expect(restored.history[0].drops[9]).not.toHaveProperty("html");
    expect(restored.history[0].drops[9]).not.toHaveProperty("isAdmin");
  });
  it("refuse des probabilités corrompues et des options non booléennes", () => {
    expect(() =>
      parseSave({
        ...createGame(),
        rates: {
          ...createGame().rates,
          discovery: { ...BOXES.discovery.weights, rare: -1 },
        },
      }),
    ).toThrow("probabilités");
    expect(() =>
      parseSave({
        ...createGame(),
        preferences: { sound: "true", reducedMotion: false },
      }),
    ).toThrow("option");
  });
  it("refuse un JSON invalide et les fichiers de plus de 3 Mo", () => {
    expect(() => importSave("{broken")).toThrow("JSON");
    expect(() => importSave(" ".repeat(3_000_001))).toThrow("volumineux");
  });
  it("élimine les propriétés étrangères au schéma au lieu de les réutiliser", () => {
    const state = parseSave({
      ...createGame(),
      isAdmin: true,
      html: "<script>alert(1)</script>",
    });
    expect(state).not.toHaveProperty("isAdmin");
    expect(state).not.toHaveProperty("html");
  });
  it("migre les anciens plans en restituant chaque référence une seule fois", () => {
    const pieces = {
      "brick-1x1:orange": 1,
      "slope-2x2:mint": 3,
      "plate-2x2:mint": 1,
    };
    const state = openBox(createGame(), "discovery", { random: () => 0 });
    const legacy = {
      ...state,
      version: 1,
      inventory: { ...state.inventory, "slope-2x2:mint": 2 },
      discovered: [...new Set([...state.discovered, ...Object.keys(pieces)])],
      constructions: [
        {
          id: "legacy-tree",
          recipeId: "tree",
          createdAt: new Date().toISOString(),
          pieces,
        },
      ],
    };
    const migrated = parseSave(legacy);
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
    expect(migrated.constructions).toEqual([]);
    expect(migrated.inventory).toEqual({
      ...state.inventory,
      "brick-1x1:orange": 1,
      "slope-2x2:mint": 5,
      "plate-2x2:mint": 1,
    });
    expect(migrated.pendingOpening).toEqual(state.pendingOpening);
    expect(migrated.coins).toBe(state.coins);
    expect(migrated.goalRecipeId).toBeNull();
    expect(parseSave(migrated)).toEqual(migrated);
  });
  it("vérifie aussi les anciens plans avant tout remboursement", () => {
    expect(() =>
      parseSave({
        ...createGame(),
        version: 1,
        discovered: ["brick-1x1:orange"],
        constructions: [
          {
            id: "fake",
            recipeId: "tree",
            createdAt: new Date().toISOString(),
            pieces: { "brick-1x1:orange": 5 },
          },
        ],
      }),
    ).toThrow("incompatibles");
  });
  it("conserve un objectif valide et refuse un objectif injecté", () => {
    expect(
      parseSave({ ...createGame(), goalRecipeId: "tree" }).goalRecipeId,
    ).toBe("tree");
    expect(() =>
      parseSave({ ...createGame(), goalRecipeId: "__proto__" }),
    ).toThrow("objectif");
  });
  it("migre la v2 en ne démontant que l’ancien sapin", () => {
    const other = buildRecipe(
      adminCommand(createGame(), { type: "recipe", recipeId: "totem" }, true),
      "totem",
    );
    const oldTreePieces = {
      "plate-4x4:ivory": 1,
      "brick-2x2:orange": 1,
      "plate-6x6:mint": 1,
      "brick-2x2:mint": 2,
      "plate-4x4:mint": 1,
      "plate-2x2:mint": 1,
      "round-1x1:mint": 1,
      "slope-1x1:mint": 1,
    };
    const legacy = {
      ...other,
      version: 2,
      production: undefined,
      goalRecipeId: "tree",
      discovered: [...other.discovered, ...Object.keys(oldTreePieces)],
      constructions: [
        ...other.constructions,
        {
          id: "old-tree",
          recipeId: "tree",
          createdAt: new Date().toISOString(),
          pieces: oldTreePieces,
        },
      ],
    };
    const migrated = parseSave(legacy);
    expect(migrated.constructions).toEqual(other.constructions);
    expect(migrated.inventory).toEqual(oldTreePieces);
    expect(migrated.goalRecipeId).toBe("tree");
    expect(migrated.claimedAchievements).toEqual([]);
    expect(migrated.lastVisitRewardAt).toBeNull();
    expect(parseSave(migrated)).toEqual(migrated);
  });
  it("refuse les récompenses inconnues, en double et les dates invalides", () => {
    expect(() =>
      parseSave({ ...createGame(), claimedAchievements: ["__proto__"] }),
    ).toThrow("défi inconnu");
    expect(() =>
      parseSave({
        ...createGame(),
        claimedAchievements: ["first-expert", "first-expert"],
      }),
    ).toThrow("double");
    expect(() =>
      parseSave({ ...createGame(), lastVisitRewardAt: "hier" }),
    ).toThrow("date");
    expect(() =>
      parseSave({ ...createGame(), lastVisitRewardAt: undefined }),
    ).toThrow("date");
  });
  it("ignore une XP injectée et conserve les récompenses déjà reçues", () => {
    const date = new Date().toISOString();
    const parsed = parseSave({
      ...createGame(),
      xp: 999999,
      level: 90,
      claimedAchievements: ["first-expert"],
      lastVisitRewardAt: date,
    });
    expect(parsed).not.toHaveProperty("xp");
    expect(parsed).not.toHaveProperty("level");
    expect(parsed.claimedAchievements).toEqual(["first-expert"]);
    expect(parsed.lastVisitRewardAt).toBe(date);
  });

  it.each(Object.keys(historicalRecipes))(
    "migre le plan v3 %s sans perdre ni dupliquer une référence",
    (recipeId) => {
      const source = v3ConstructionSave(recipeId);
      const before = JSON.parse(JSON.stringify(source));
      const current = RECIPE_BY_ID.get(recipeId);
      const expectedRefund =
        !current ||
        canonicalGeometry(current) !== historicalRecipes[recipeId].geometry;
      const { state, migration } = parseSaveResult(source);
      expect(state.version).toBe(CURRENT_SAVE_VERSION);
      expect(source).toEqual(before);
      if (expectedRefund) {
        const expectedInventory = { ...source.inventory } as Record<
          string,
          number
        >;
        for (const [id, quantity] of Object.entries(
          source.constructions[0].pieces,
        ))
          expectedInventory[id] = (expectedInventory[id] ?? 0) + quantity;
        expect(state.inventory).toEqual(expectedInventory);
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
      expect(state.preferences).toEqual(source.preferences);
      expect(state.claimedAchievements).toEqual(source.claimedAchievements);
      expect(state.lastVisitRewardAt).toBe(source.lastVisitRewardAt);
      expect(parseSave(state)).toEqual(state);
      expect(parseSaveResult(state).migration).toBeUndefined();
    },
  );

  it("rembourse aussi une géométrie revue avec une nomenclature inchangée", () => {
    const source = v3ConstructionSave("totem");
    const current = RECIPE_BY_ID.get("totem");
    const revised = historicalRecipe("totem");
    revised.placements[0].rotation = 90;
    RECIPE_BY_ID.set("totem", revised);
    try {
      const parsed = parseSave(source);
      expect(parsed.constructions).toEqual([]);
      expect(parsed.inventory["brick-2x2:coral"]).toBe(8);
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
      else RECIPE_BY_ID.delete("totem");
    }
  });

  it("conserve la quantité totale de chaque référence dans un atelier contenant les 37 plans v3", () => {
    const saves = Object.keys(historicalRecipes).map(v3ConstructionSave);
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
      const inventory = { ...state.inventory };
      for (const construction of state.constructions)
        for (const [id, quantity] of Object.entries(construction.pieces))
          inventory[id] = (inventory[id] ?? 0) + quantity;
      return inventory;
    };
    const migrated = parseSave(source);
    expect(totals(migrated)).toEqual(totals(source));
    expect(migrated.constructions.length).toBeLessThanOrEqual(37);
    expect(parseSave(migrated)).toEqual(migrated);
  });

  it("restitue les couleurs réellement utilisées dans un plan à couleur libre", () => {
    const source = v3ConstructionSave("totem");
    source.constructions[0].pieces = {
      "brick-2x2:blue": 2,
      "brick-2x2:yellow": 3,
    };
    source.discovered = [
      "brick-2x2:coral",
      "brick-2x2:blue",
      "brick-2x2:yellow",
    ];
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      expect(parseSave(source).inventory).toEqual({
        "brick-2x2:coral": 3,
        "brick-2x2:blue": 2,
        "brick-2x2:yellow": 3,
      });
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
    }
  });

  it("détecte aussi une nomenclature revue sans changement géométrique", () => {
    const source = v3ConstructionSave("totem");
    const current = RECIPE_BY_ID.get("totem");
    const revised = historicalRecipe("totem");
    revised.requirements[0].quantity += 1;
    RECIPE_BY_ID.set("totem", revised);
    try {
      expect(parseSave(source).constructions).toEqual([]);
      expect(parseSave(source).inventory["brick-2x2:coral"]).toBe(8);
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
      else RECIPE_BY_ID.delete("totem");
    }
  });

  it("conserve les créations dont seuls le texte et l’ordre des instructions changent", () => {
    const source = v3ConstructionSave("totem");
    const current = RECIPE_BY_ID.get("totem");
    const revised = historicalRecipe("totem");
    revised.name = "Un autre titre";
    revised.description = "Une autre présentation";
    revised.placements.reverse();
    revised.placements.forEach((p, i) => (p.key = `new-${i}`));
    RECIPE_BY_ID.set("totem", revised);
    try {
      const parsed = parseSave(source);
      expect(parsed.constructions).toEqual(source.constructions);
      expect(parsed.inventory).toEqual(source.inventory);
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
      else RECIPE_BY_ID.delete("totem");
    }
  });

  it("valide et restitue un plan retiré, puis efface son objectif", () => {
    const source = v3ConstructionSave("totem");
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      const { state, migration } = parseSaveResult(source);
      expect(state.goalRecipeId).toBeNull();
      expect(state.constructions).toEqual([]);
      expect(state.inventory["brick-2x2:coral"]).toBe(8);
      expect(migration).toEqual({
        refundedConstructions: 1,
        returnedPieces: 5,
        clearedGoal: true,
      });
      expect(() =>
        parseSave({
          ...source,
          constructions: [
            { ...source.constructions[0], pieces: { "brick-1x1:coral": 6 } },
          ],
        }),
      ).toThrow("incompatibles");
      expect(() => parseSave({ ...state, goalRecipeId: "totem" })).toThrow(
        "objectif",
      );
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
    }
  });

  it("annule un objectif retiré même si aucune création ne doit être remboursée", () => {
    const source = { ...v3ConstructionSave("totem"), constructions: [] };
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      const { state, migration } = parseSaveResult(source);
      expect(state.goalRecipeId).toBeNull();
      expect(state.inventory).toEqual(source.inventory);
      expect(migration).toEqual({
        refundedConstructions: 0,
        returnedPieces: 0,
        clearedGoal: true,
      });
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
    }
  });

  it("refuse un remboursement au-delà de la limite sans modifier la source", () => {
    const source = v3ConstructionSave("totem");
    source.inventory["brick-2x2:coral"] = 10_000_000;
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    const before = JSON.parse(JSON.stringify(source));
    try {
      expect(() => parseSave(source)).toThrow("limite d’inventaire");
      expect(source).toEqual(before);
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
    }
  });

  it("refuse un plan v3 inconnu même s’il est ajouté au catalogue actuel", () => {
    const recipe = { ...historicalRecipe("totem"), id: "invented-v4" };
    RECIPE_BY_ID.set(recipe.id, recipe);
    try {
      const source = v3ConstructionSave("totem");
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

  it("préserve les ouvertures en cours et les récompenses lors d’une restitution v3", () => {
    const source = v3ConstructionSave("totem");
    const opened = openBox(createGame(), "discovery", { random: () => 0 });
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      const parsed = parseSave({
        ...source,
        inventory: { ...source.inventory, ...opened.inventory },
        discovered: [...new Set([...source.discovered, ...opened.discovered])],
        history: opened.history,
        pendingOpening: opened.pendingOpening,
        boxesOpened: opened.boxesOpened,
      });
      expect(parsed.pendingOpening).toEqual(opened.pendingOpening);
      expect(parsed.history).toEqual(opened.history);
      expect(parsed.boxesOpened).toBe(opened.boxesOpened);
      expect(parsed.claimedAchievements).toEqual(source.claimedAchievements);
      expect(parsed.lastVisitRewardAt).toBe(source.lastVisitRewardAt);
      expect(parseSave(parsed)).toEqual(parsed);
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
    }
  });

  it("récupère une v4 de développement sans marqueur comme un instantané v3 strict", () => {
    const { planRevision: _unused, ...legacy } = v3ConstructionSave("totem");
    const source = { ...legacy, version: 4 };
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      const parsed = parseSave(source);
      expect(parsed.version).toBe(CURRENT_SAVE_VERSION);
      expect(parsed.planRevision).toBe(1);
      expect(parsed.constructions).toEqual([]);
      expect(parsed.inventory["brick-2x2:coral"]).toBe(8);
      expect(parsed.claimedAchievements).toEqual(source.claimedAchievements);
      expect(parsed.lastVisitRewardAt).toBe(source.lastVisitRewardAt);
      expect(parseSave(parsed)).toEqual(parsed);
      expect(() =>
        parseSave({
          ...source,
          constructions: [
            { ...source.constructions[0], pieces: { "brick-1x1:coral": 5 } },
          ],
        }),
      ).toThrow("incompatibles");
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
    }
  });

  it.each([0, 2, "1", null, {}, -1])(
    "refuse une révision de plans v4 non prise en charge (%j)",
    (planRevision) => {
      expect(() =>
        parseSave({ ...createGame(), version: 4, planRevision }),
      ).toThrow("révision");
    },
  );

  it.each(Object.keys(LEGACY_REQUIREMENTS))(
    "continue à valider et restituer le plan v1 %s",
    (recipeId) => {
      const recipe = historicalRecipe(recipeId);
      recipe.requirements = LEGACY_REQUIREMENTS[recipeId];
      const pieces = recipeProgress(
        {
          ...createGame(),
          inventory: Object.fromEntries(CATALOG.map((part) => [part.id, 1000])),
        },
        recipe,
      ).pieces;
      const source = v3ConstructionSave(recipeId);
      const parsed = parseSave({
        ...source,
        version: 1,
        inventory: {},
        discovered: Object.keys(pieces),
        constructions: [{ ...source.constructions[0], pieces }],
      });
      expect(parsed.constructions).toEqual([]);
      expect(parsed.inventory).toEqual(pieces);
      expect(parsed.goalRecipeId).toBeNull();
      expect(parsed.claimedAchievements).toEqual([]);
      expect(parsed.lastVisitRewardAt).toBeNull();
      expect(parseSave(parsed)).toEqual(parsed);
    },
  );

  it.each([...V2_RECIPE_IDS])(
    "continue à migrer le plan v2 %s depuis ses anciens matériaux",
    (recipeId) => {
      const recipe = historicalRecipe(recipeId);
      if (recipeId === "tree") recipe.requirements = V2_TREE_REQUIREMENTS;
      const pieces = recipeProgress(
        {
          ...createGame(),
          inventory: Object.fromEntries(CATALOG.map((part) => [part.id, 1000])),
        },
        recipe,
      ).pieces;
      const source = v3ConstructionSave(recipeId);
      const parsed = parseSave({
        ...source,
        version: 2,
        inventory: {},
        discovered: Object.keys(pieces),
        constructions: [{ ...source.constructions[0], pieces }],
      });
      const current = RECIPE_BY_ID.get(recipeId);
      const refund =
        recipeId === "tree" ||
        !current ||
        canonicalGeometry(current) !== historicalRecipes[recipeId].geometry;
      expect(parsed.constructions).toEqual(
        refund ? [] : [{ ...source.constructions[0], pieces }],
      );
      expect(parsed.inventory).toEqual(refund ? pieces : {});
      expect(parsed.goalRecipeId).toBe(current ? recipeId : null);
      expect(parsed.claimedAchievements).toEqual([]);
      expect(parsed.lastVisitRewardAt).toBeNull();
      expect(parseSave(parsed)).toEqual(parsed);
    },
  );
});
