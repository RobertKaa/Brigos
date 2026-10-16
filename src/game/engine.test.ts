import { describe, expect, it } from "vitest";
import {
  BOXES,
  BOX_DROP_COUNT,
  BRIGO_BY_ID,
  BY_RARITY,
  CATALOG,
  RARITIES,
  RECIPES,
} from "./catalog";
import type { Rarity } from "./catalog";
import {
  MAX_VALUE,
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
  drawRarity,
  finishOpening,
  inventoryCount,
  openBox,
  openNextBox,
  followRecipe,
  recipeProgress,
  trackedRecipeProgress,
  reservedCount,
  secureRandom,
  validateWeights,
} from "./engine";

describe("ouverture de boîtes", () => {
  it("enchaîne atomiquement les boîtes et ne crédite jamais deux fois la précédente", () => {
    const first = openBox(createGame(), "discovery", { random: () => 0 });
    const next = openNextBox(first, "workshop", { random: () => 0 });
    expect(next.pendingOpening?.id).not.toBe(first.pendingOpening?.id);
    expect(next.history).toHaveLength(2);
    expect(inventoryCount(next)).toBe(20);
    expect(next.coins).toBe(950);
    expect(next.boxes.discovery).toBe(2);
    expect(next.boxesOpened).toBe(2);
    expect(first.pendingOpening).not.toBeNull();
  });
  it("préserve l’ouverture courante si la suivante échoue", () => {
    const state = openBox({ ...createGame(), coins: 0 }, "discovery", {
      random: () => 0,
    });
    const snapshot = structuredClone(state);
    expect(() => openNextBox(state, "prism")).toThrow("manque");
    expect(state).toEqual(snapshot);
    expect(() => openNextBox(createGame(), "discovery")).toThrow("Aucune");
  });
  it("permet de suivre et retirer un plan connu", () => {
    expect(followRecipe(createGame(), "tree").goalRecipeId).toBe("tree");
    expect(
      followRecipe(followRecipe(createGame(), "tree"), null).goalRecipeId,
    ).toBeNull();
    expect(() => followRecipe(createGame(), "intrus")).toThrow("n’existe pas");
  });
  it("crédite exactement dix Brigos, une seule boîte et aucune dépense pour une boîte en réserve", () => {
    const original = createGame();
    const opened = openBox(original, "discovery", { random: () => 0 });
    expect(opened.pendingOpening?.drops).toHaveLength(10);
    expect(inventoryCount(opened)).toBe(10);
    expect(opened.boxes.discovery).toBe(2);
    expect(opened.coins).toBe(1200);
    expect(opened.boxesOpened).toBe(1);
    expect(original.inventory).toEqual({});
    expect(original.boxes.discovery).toBe(3);
  });
  it("identifie les doublons dans la même boîte sans compter plusieurs découvertes", () => {
    const opened = openBox(createGame(), "discovery", { random: () => 0 });
    expect(opened.discovered).toHaveLength(1);
    expect(opened.pendingOpening!.drops.map((drop) => drop.isNew)).toEqual([
      true,
      ...Array.from({ length: 9 }, () => false),
    ]);
    const next = openBox(finishOpening(opened), "discovery", {
      random: () => 0,
    });
    expect(next.pendingOpening!.drops.every((drop) => !drop.isNew)).toBe(true);
    expect(inventoryCount(next)).toBe(20);
  });
  it("déduit le prix uniquement si aucune boîte correspondante n’est disponible", () => {
    const original = createGame();
    const result = openBox(original, "workshop", { random: () => 0 });
    expect(result.coins).toBe(1200 - BOXES.workshop.cost);
    expect(result.boxes.workshop).toBe(0);
    expect(result.boxes.discovery).toBe(3);
    expect(inventoryCount(result)).toBe(10);
  });
  it("refuse les soldes insuffisants sans modifier la partie", () => {
    const original = {
      ...createGame(),
      coins: 0,
      boxes: { discovery: 0, workshop: 0, prism: 0 },
    };
    expect(() => openBox(original, "discovery")).toThrow("manque");
    expect(original.history).toHaveLength(0);
    expect(inventoryCount(original)).toBe(0);
  });
  it("empêche une deuxième ouverture tant que la première n’est pas terminée", () => {
    const opened = openBox(createGame(), "discovery", { random: () => 0 });
    expect(() => openBox(opened, "discovery")).toThrow("en cours");
    expect(inventoryCount(finishOpening(opened))).toBe(10);
  });
  it.each(RARITIES)(
    "permet un tirage de test de dix Brigos %s, avec autorisation explicite",
    (rarity) => {
      expect(() =>
        openBox(createGame(), "discovery", { forcedRarity: rarity }),
      ).toThrow("admin");
      const result = openBox(createGame(), "discovery", {
        forcedRarity: rarity,
        adminEnabled: true,
        random: () => 0.5,
      });
      expect(result.pendingOpening!.drops).toHaveLength(10);
      expect(
        result.pendingOpening!.drops.every(
          (drop) => BRIGO_BY_ID.get(drop.brigoId)!.rarity === rarity,
        ),
      ).toBe(true);
    },
  );
  it("borne l’historique sans perdre le nombre total d’ouvertures", () => {
    let state = adminCommand(
      createGame(),
      { type: "boxes", boxId: "discovery", amount: 50 },
      true,
    );
    for (let i = 0; i < 40; i++)
      state = finishOpening(openBox(state, "discovery", { random: () => 0 }));
    expect(state.history).toHaveLength(30);
    expect(state.boxesOpened).toBe(40);
    expect(inventoryCount(state)).toBe(400);
  });
  it("garantit un tirage cryptographique dans l’intervalle attendu", () => {
    for (let i = 0; i < 100; i++) {
      const value = secureRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
  it.each([NaN, Infinity, -0.1, 1])(
    "rejette une source aléatoire invalide (%s) sans dépense",
    (value) => {
      const original = createGame();
      expect(() =>
        openBox(original, "discovery", { random: () => value }),
      ).toThrow("tirage");
      expect(original.coins).toBe(1200);
    },
  );
  it.each(["discovery", "workshop"] as const)(
    "annule toute la boîte %s si le dixième Brigo dépasse la capacité",
    (boxId) => {
      const brigoId = BY_RARITY.common[0].id;
      const original = {
        ...createGame(),
        inventory: { [brigoId]: MAX_VALUE - 9 },
        discovered: [brigoId],
      };
      const before = structuredClone(original);
      expect(() => openBox(original, boxId, { random: () => 0 })).toThrow(
        "plein",
      );
      expect(original).toEqual(before);
    },
  );
  it("accepte une boîte atteignant exactement la capacité autorisée", () => {
    const brigoId = BY_RARITY.common[0].id;
    const state = {
      ...createGame(),
      inventory: { [brigoId]: MAX_VALUE - 10 },
      discovered: [brigoId],
    };
    const opened = openBox(state, "discovery", { random: () => 0 });
    expect(opened.inventory[brigoId]).toBe(MAX_VALUE);
    expect(opened.pendingOpening?.drops).toHaveLength(BOX_DROP_COUNT);
  });
  it("préserve toute l’ouverture courante si l’aléatoire échoue à la dernière carte de la suivante", () => {
    const state = openBox(createGame(), "discovery", { random: () => 0 });
    const before = structuredClone(state);
    let draws = 0;
    const random = () => (++draws === BOX_DROP_COUNT * 2 ? NaN : 0);
    expect(() => openNextBox(state, "workshop", { random })).toThrow("tirage");
    expect(draws).toBe(20);
    expect(state).toEqual(before);
  });
  it.each(RARITIES)(
    "tire dix références dans la bonne plage aux deux bornes de la rareté %s",
    (rarity) => {
      for (const value of [0, 1 - Number.EPSILON]) {
        const state = openBox(createGame(), "discovery", {
          forcedRarity: rarity,
          adminEnabled: true,
          random: () => value,
        });
        const pool = BY_RARITY[rarity];
        const expected = value === 0 ? pool[0].id : pool.at(-1)!.id;
        expect(state.pendingOpening?.drops.map((drop) => drop.brigoId)).toEqual(
          Array.from({ length: BOX_DROP_COUNT }, () => expected),
        );
      }
    },
  );
  it("bloque la limite d’ouvertures sans distribuer une boîte supplémentaire", () => {
    const state = { ...createGame(), boxesOpened: MAX_VALUE };
    const before = structuredClone(state);
    expect(() => openBox(state, "discovery", { random: () => 0 })).toThrow(
      "limite",
    );
    expect(state).toEqual(before);
  });
});
describe("probabilités", () => {
  it.each([
    [0, "common"],
    [0.579999, "common"],
    [0.58, "uncommon"],
    [0.839999, "uncommon"],
    [0.84, "rare"],
    [0.95, "epic"],
    [0.99, "legendary"],
    [0.999999, "legendary"],
  ] as [number, Rarity][])(
    "respecte les bornes du tirage %s → %s",
    (value, rarity) => {
      expect(drawRarity(BOXES.discovery.weights, () => value)).toBe(rarity);
    },
  );
  it("exclut une rareté à zéro et accepte un tirage entièrement déterministe", () => {
    const weights = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 100,
      legendary: 0,
    };
    expect(drawRarity(weights, () => 0)).toBe("epic");
    expect(drawRarity(weights, () => 0.9999)).toBe("epic");
  });
  it("refuse les taux négatifs, non numériques ou dont le total n’est pas 100", () => {
    for (const weights of [
      { ...BOXES.discovery.weights, common: -1 },
      { ...BOXES.discovery.weights, rare: NaN },
      { ...BOXES.discovery.weights, rare: 12 },
    ]) {
      expect(validateWeights(weights)).toBe(false);
      expect(() => drawRarity(weights)).toThrow("100");
    }
  });
});
describe("construction et conservation des Brigos", () => {
  it("garde l’objectif réalisé quand ses pièces sont réservées dans la création", () => {
    const supplied = adminCommand(
      createGame(),
      { type: "recipe", recipeId: "totem" },
      true,
    );
    const built = buildRecipe(supplied, "totem");
    const tracked = trackedRecipeProgress(built, RECIPES[0]);
    expect(recipeProgress(built, RECIPES[0]).available).toBe(0);
    expect(tracked.completed).toBe(true);
    expect(tracked.available).toBe(tracked.total);
    const restored = dismantle(built, built.constructions[0].id);
    expect(trackedRecipeProgress(restored, RECIPES[0]).canBuild).toBe(true);
  });
  it("réserve les couleurs imposées avant les emplacements de couleur libre", () => {
    const recipe = {
      ...RECIPES[0],
      requirements: [
        { label: "Couleur libre", modelId: "brick-2x2", quantity: 1 },
        {
          label: "Corail",
          modelId: "brick-2x2",
          colorId: "coral" as const,
          quantity: 1,
        },
      ],
    };
    const state = {
      ...createGame(),
      inventory: { "brick-2x2:coral": 1, "brick-2x2:blue": 1 },
    };
    const progress = recipeProgress(state, recipe);
    expect(progress.canBuild).toBe(true);
    expect(progress.pieces).toEqual({
      "brick-2x2:coral": 1,
      "brick-2x2:blue": 1,
    });
    expect(progress.requirements.map((item) => item.label)).toEqual([
      "Couleur libre",
      "Corail",
    ]);
  });
  it.each(RECIPES.map((recipe) => [recipe.id, recipe] as const))(
    "réserve puis restitue exactement les mêmes références pour %s",
    (_id, recipe) => {
      const supplied = adminCommand(
        createGame(),
        { type: "recipe", recipeId: recipe.id },
        true,
      );
      const before = { ...supplied.inventory };
      const total = inventoryCount(supplied);
      const built = buildRecipe(supplied, recipe.id);
      expect(inventoryCount(built) + reservedCount(built)).toBe(total);
      expect(built.discovered).toEqual(supplied.discovered);
      const restored = dismantle(built, built.constructions[0].id);
      expect(restored.inventory).toEqual(before);
      expect(restored.constructions).toHaveLength(0);
      expect(restored.discovered).toEqual(supplied.discovered);
    },
  );
  it("refuse la construction sans pièces, la double utilisation et le double démontage", () => {
    expect(() => buildRecipe(createGame(), "totem")).toThrow("manque");
    const built = buildRecipe(
      adminCommand(createGame(), { type: "recipe", recipeId: "totem" }, true),
      "totem",
    );
    expect(() => buildRecipe(built, "totem")).toThrow("manque");
    const restored = dismantle(built, built.constructions[0].id);
    expect(() => dismantle(restored, built.constructions[0].id)).toThrow(
      "plus",
    );
  });
  it("n’utilise pas une mauvaise couleur pour un plan précis", () => {
    const state = adminCommand(
      createGame(),
      { type: "piece", brigoId: "brick-1x1:coral", amount: 10 },
      true,
    );
    expect(
      recipeProgress(
        state,
        RECIPES.find((recipe) => recipe.id === "tree")!,
      ).requirements[0].available,
    ).toBe(0);
  });
  it("utilise les pièces communes en priorité quand la couleur et la forme sont libres", () => {
    let state = adminCommand(
      createGame(),
      { type: "piece", brigoId: "brick-2x2:charcoal", amount: 5 },
      true,
    );
    state = adminCommand(
      state,
      { type: "piece", brigoId: "brick-2x2:coral", amount: 5 },
      true,
    );
    const built = buildRecipe(state, "totem");
    expect(built.inventory["brick-2x2:charcoal"]).toBe(5);
    expect(built.inventory["brick-2x2:coral"]).toBeUndefined();
  });
  it("complète seulement les pièces manquantes et peut être répété sans duplication", () => {
    const state = adminCommand(
      createGame(),
      { type: "piece", brigoId: "brick-2x2:coral", amount: 3 },
      true,
    );
    const supplied = adminCommand(
      state,
      { type: "recipe", recipeId: "totem" },
      true,
    );
    expect(inventoryCount(supplied)).toBe(5);
    expect(
      adminCommand(supplied, { type: "recipe", recipeId: "totem" }, true)
        .inventory,
    ).toEqual(supplied.inventory);
  });
});
describe("commandes admin locales", () => {
  it("refuse toutes les commandes si le mode admin est désactivé", () => {
    expect(() =>
      adminCommand(createGame(), { type: "catalog", amount: 3 }, false),
    ).toThrow("désactivé");
    expect(() => adminCommand(createGame(), { type: "reset" }, false)).toThrow(
      "désactivé",
    );
  });
  it.each([-1, 0, 1.5, NaN, Infinity, 100001])(
    "refuse une quantité invalide (%s)",
    (amount) => {
      const state = createGame();
      expect(() =>
        adminCommand(state, { type: "coins", amount }, true),
      ).toThrow("entier");
      expect(state.coins).toBe(1200);
    },
  );
  it("ajoute le catalogue sans le compter comme des boîtes ouvertes", () => {
    const state = adminCommand(
      createGame(),
      { type: "catalog", amount: 3 },
      true,
    );
    expect(state.discovered).toHaveLength(CATALOG.length);
    expect(inventoryCount(state)).toBe(CATALOG.length * 3);
    expect(state.boxesOpened).toBe(0);
  });
  it("refuse une référence inconnue et protège le dictionnaire contre la pollution de prototype", () => {
    expect(() =>
      adminCommand(
        createGame(),
        { type: "piece", brigoId: "__proto__", amount: 1 },
        true,
      ),
    ).toThrow("n’existe pas");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it("refuse les dépassements de quantité", () => {
    expect(() =>
      adminCommand(
        { ...createGame(), coins: MAX_VALUE },
        { type: "coins", amount: 1 },
        true,
      ),
    ).toThrow("pleine");
    expect(() =>
      adminCommand(
        { ...createGame(), inventory: { "brick-1x1:coral": MAX_VALUE } },
        { type: "piece", brigoId: "brick-1x1:coral", amount: 1 },
        true,
      ),
    ).toThrow("plein");
  });
  it("rétablit une nouvelle partie complète avec les valeurs initiales", () => {
    const modified = adminCommand(
      createGame(),
      { type: "catalog", amount: 3 },
      true,
    );
    expect(adminCommand(modified, { type: "reset" }, true)).toEqual(
      createGame(),
    );
  });
});
