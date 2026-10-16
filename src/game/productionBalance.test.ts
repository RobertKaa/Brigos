import { describe, expect, it } from "vitest";
import { CATALOG, RECIPES, RECIPE_BY_ID, pieceCount } from "./catalog";
import type { Recipe } from "./catalog";
import {
  adminCommand,
  buildRecipe,
  createGame,
  matchesRequirement,
} from "./engine";
import { DAILY_COIN_BUDGET } from "./engagement";
import { PART_PRICES } from "./market";
import {
  collectRecipeProduction,
  getProduction,
  PRODUCTION_RESERVE_MS,
  productionPerCycle,
  recipeProductionIntervalMs,
  recipeProductionPerDay,
} from "./production";

const START = Date.parse("2026-10-19T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Synthetic quotes isolate size and material rarity without altering a plan. */
function quoteFor(modelId: string, quantity: number): Recipe {
  return {
    ...RECIPE_BY_ID.get("totem")!,
    id: `balance-${modelId}-${quantity}`,
    requirements: [{ label: "Matériaux de test", modelId, quantity }],
    placements: [],
  };
}

describe("équilibre des revenus de constructions", () => {
  it.each(RECIPES)(
    "borne le revenu quotidien de $id et conserve trois jours de réserve",
    (recipe) => {
      const income = recipeProductionPerDay(recipe);
      expect(Number.isSafeInteger(income)).toBe(true);
      expect(income).toBeGreaterThanOrEqual(24);
      expect(income).toBeLessThanOrEqual(96);
      const interval = recipeProductionIntervalMs(recipe);
      expect([HOUR, 2 * HOUR, 4 * HOUR, 8 * HOUR]).toContain(interval);
      expect(PRODUCTION_RESERVE_MS).toBe(3 * DAY);
      expect(PRODUCTION_RESERVE_MS % interval).toBe(0);
      expect(productionPerCycle(recipe) * (DAY / interval)).toBe(income);
    },
  );

  it("augmente le rendement avec la rareté pour un nombre égal de matériaux", () => {
    const common = recipeProductionPerDay(quoteFor("brick-1x1", 100));
    const rare = recipeProductionPerDay(quoteFor("special-window", 100));
    const legendary = recipeProductionPerDay(quoteFor("special-cross", 100));
    expect(rare).toBeGreaterThan(common);
    expect(legendary).toBeGreaterThan(rare);
  });

  it("augmente progressivement avec la quantité sans quadrupler les gains", () => {
    const small = recipeProductionPerDay(quoteFor("brick-1x1", 100));
    const fourTimesLarger = recipeProductionPerDay(quoteFor("brick-1x1", 400));
    expect(fourTimesLarger).toBeGreaterThan(small);
    expect(fourTimesLarger).toBeLessThan(small * 4);
    expect(recipeProductionPerDay(quoteFor("special-cross", 100_000))).toBe(96);
  });

  it("se fonde sur les matériaux et non sur l’étiquette de difficulté du plan", () => {
    const quote = quoteFor("special-window", 100);
    const beginner = { ...quote, difficulty: "Premiers pas" as const };
    const legendary = { ...quote, difficulty: "Légendaire" as const };
    expect(recipeProductionPerDay(beginner)).toBe(
      recipeProductionPerDay(legendary),
    );
  });

  it("garde le revenu d’une copie légendaire en complément du carnet quotidien", () => {
    const legendary = RECIPES.filter(
      (recipe) => recipe.difficulty === "Légendaire",
    );
    expect(legendary.length).toBeGreaterThan(0);
    for (const recipe of legendary) {
      const daily = recipeProductionPerDay(recipe);
      expect(daily).toBeLessThan(DAILY_COIN_BUDGET);
      expect(daily * (PRODUCTION_RESERVE_MS / DAY)).toBeLessThan(
        DAILY_COIN_BUDGET,
      );
    }
    expect(
      recipeProductionPerDay(RECIPE_BY_ID.get("high-citadel")!) *
        (PRODUCTION_RESERVE_MS / DAY),
    ).toBe(288);
  });

  it.each([
    ["totem", 1, 1, 24],
    ["harbour-lighthouse", 2, 3, 36],
    ["travellers-station", 4, 7, 42],
    ["astreval-gardens", 8, 21, 63],
    ["aurora-palace", 8, 27, 81],
    ["high-citadel", 8, 32, 96],
  ] as const)(
    "%s donne %i h par cycle, %i pièces par cycle et %i par jour",
    (id, hours, perCycle, daily) => {
      const recipe = RECIPE_BY_ID.get(id)!;
      expect(recipeProductionIntervalMs(recipe)).toBe(hours * HOUR);
      expect(productionPerCycle(recipe)).toBe(perCycle);
      expect(recipeProductionPerDay(recipe)).toBe(daily);
    },
  );

  it.each([
    [49, 1],
    [50, 2],
    [199, 2],
    [200, 4],
    [899, 4],
    [900, 8],
  ])("fait passer %i matériaux dans le cycle de %i h", (quantity, hours) => {
    const recipe = quoteFor("brick-1x1", quantity);
    expect(pieceCount(recipe)).toBe(quantity);
    expect(recipeProductionIntervalMs(recipe)).toBe(hours * HOUR);
  });

  it.each(["brick-1x1", "special-window", "special-cross"])(
    "ne réduit jamais le revenu de %s quand la quantité augmente, même aux seuils",
    (modelId) => {
      let previous = 0;
      for (let quantity = 1; quantity <= 2_000; quantity++) {
        const current = recipeProductionPerDay(quoteFor(modelId, quantity));
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    },
  );

  it("ne réduit pas le revenu entre deux plans du catalogue de valeur croissante", () => {
    const recipes = RECIPES.map((recipe) => ({
      recipe,
      value: recipe.requirements.reduce((sum, requirement) => {
        const part = CATALOG.find((candidate) =>
          matchesRequirement(candidate, requirement),
        )!;
        return sum + requirement.quantity * PART_PRICES[part.rarity];
      }, 0),
    })).sort((a, b) => a.value - b.value);
    let previous = 0;
    for (const { recipe } of recipes) {
      const current = recipeProductionPerDay(recipe);
      expect(current, recipe.id).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it("additionne le revenu des exemplaires sans fabriquer de Brigos", () => {
    let state = { ...createGame(), coins: 0 };
    for (let copy = 0; copy < 3; copy++) {
      state = buildRecipe(
        adminCommand(state, { type: "recipe", recipeId: "totem" }, true),
        "totem",
        START,
      );
    }
    const recipe = RECIPE_BY_ID.get("totem")!;
    const each = productionPerCycle(recipe);
    expect(getProduction(state, START).totalPerDay).toBe(
      recipeProductionPerDay(recipe) * 3,
    );
    const received = collectRecipeProduction(
      state,
      "totem",
      START + recipeProductionIntervalMs(recipe),
    );
    expect(received.coins).toBe(each * 3);
    expect(received.inventory).toBe(state.inventory);
    expect(received.discovered).toBe(state.discovered);
    expect(received.constructions).toBe(state.constructions);
  });
});
