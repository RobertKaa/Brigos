import { describe, expect, it } from "vitest";
import { RECIPES, RECIPE_BY_ID } from "./catalog";
import { adminCommand, buildRecipe, createGame } from "./engine";
import { recipeOrderQuote } from "./market";
import {
  collectProduction,
  getProduction,
  PRODUCTION_CYCLE_MS,
  PRODUCTION_RESERVE_MS,
  productionPerCycle,
  recipeProductionIntervalMs,
} from "./production";
import { parseSaveResult, parseSave } from "./save";

const START = Date.parse("2026-10-19T12:00:00.000Z");
const DAY = PRODUCTION_CYCLE_MS;
const HOUR = DAY / 24;
function legacy(recipeId = "totem", claimedCycles = 0, observedAt = START) {
  const built = buildRecipe(
    adminCommand(createGame(), { type: "recipe", recipeId }, true),
    recipeId,
    START,
  );
  const id = built.constructions[0].id;
  return {
    ...built,
    version: 9,
    production: {
      observedAt,
      entries: { [id]: { anchorAt: START, claimedCycles } },
    },
  };
}

describe("migration v9 vers les cadences v10", () => {
  it("conserve une demi-journée en une demi-heure pour le totem, sans gain accéléré rétroactif", () => {
    const source = legacy();
    const now = START + DAY / 2;
    const migrated = parseSaveResult(source, now).state;
    const row = getProduction(migrated, now).rows[0];
    expect(migrated.version).toBe(10);
    expect(migrated.coins).toBe(source.coins);
    expect(migrated.inventory).toEqual(source.inventory);
    expect(migrated.constructions).toEqual(source.constructions);
    expect(row).toMatchObject({
      ready: 0,
      cycleMs: HOUR,
      nextReadyAt: now + HOUR / 2,
    });
    expect(getProduction(migrated, now + HOUR / 2 - 1).totalReady).toBe(0);
    expect(getProduction(migrated, now + HOUR / 2).totalReady).toBe(1);
  });

  it("garde le montant mûr de l’ancien barème et la progression du cycle en cours", () => {
    const source = legacy();
    const now = START + DAY * 1.5;
    const migrated = parseSaveResult(source, now).state;
    const id = source.constructions[0].id;
    expect(migrated.production!.entries[id]).toEqual({
      anchorAt: now - HOUR / 2,
      claimedCycles: 0,
      bankedCoins: 2,
    });
    expect(getProduction(migrated, now).totalReady).toBe(2);
    const collected = collectProduction(migrated, undefined, now);
    expect(collected.coins - source.coins).toBe(2);
    expect(collected.production!.entries[id].bankedCoins).toBe(0);
    const imported = parseSave(collected);
    expect(collectProduction(imported, undefined, now).coins).toBe(
      collected.coins,
    );
    expect(getProduction(imported, now + HOUR / 2).totalReady).toBe(1);
  });

  it("ne rejoue pas les anciennes journées réclamées et conserve leur fraction", () => {
    const now = START + DAY * 1.5;
    const source = legacy("totem", 1, now);
    const migrated = parseSaveResult(source, now).state;
    expect(getProduction(migrated, now).totalReady).toBe(0);
    expect(getProduction(migrated, now).nextReadyAt).toBe(now + HOUR / 2);
  });

  it("borne l’ancien stock de chaque plan à ses trois jours, sans réévaluer le passé au nouveau taux", () => {
    const now = START + DAY * 100;
    for (const recipe of RECIPES) {
      const source = legacy(recipe.id);
      const migrated = parseSaveResult(source, now).state;
      const reference = recipeOrderQuote(
        { ...createGame(), inventory: {} },
        recipe,
      ).cost;
      const oldDaily = Math.max(
        2,
        Math.min(75, Math.floor(Math.sqrt(reference) / 5)),
      );
      const row = getProduction(migrated, now).rows[0];
      expect(row.ready).toBe(oldDaily * 3);
      expect(row.ready).toBeLessThanOrEqual(row.capacity);
      expect(row.capacity).toBe(
        (productionPerCycle(recipe) * PRODUCTION_RESERVE_MS) /
          recipeProductionIntervalMs(recipe),
      );
      expect(
        parseSaveResult(migrated, now + DAY * 100).state.production,
      ).toEqual(migrated.production);
    }
  });

  it("préserve le high-water mark quand la migration suit un recul d’horloge", () => {
    const source = legacy("totem", 1, START + DAY * 2.5);
    const migrated = parseSaveResult(source, START + DAY).state;
    expect(migrated.production!.observedAt).toBe(START + DAY * 2.5);
    expect(getProduction(migrated, START + DAY)).toMatchObject({
      totalReady: 2,
      clockAdjusted: true,
    });
    const collected = collectProduction(migrated, undefined, START + DAY);
    expect(getProduction(collected, START + DAY * 2.5).totalReady).toBe(0);
    expect(
      getProduction(collected, START + DAY * 2.5 + HOUR / 2).totalReady,
    ).toBe(1);
  });

  it("active une entrée v9 absente maintenant, sans lui attribuer de monnaie ancienne", () => {
    const source = {
      ...legacy(),
      production: { observedAt: START, entries: {} },
    };
    const now = START + DAY * 100;
    const migrated = parseSaveResult(source, now).state;
    expect(getProduction(migrated, now)).toMatchObject({
      totalReady: 0,
      nextReadyAt: now + HOUR,
    });
  });

  it("valide les compteurs v9 en journées de 24 h et refuse les marqueurs v10 rétrogradés", () => {
    expect(() =>
      parseSaveResult(legacy("totem", 2, START + HOUR * 2), START + HOUR * 2),
    ).toThrow("production incorrecte");
    const source = legacy();
    const id = source.constructions[0].id;
    const downgraded = {
      ...source,
      production: {
        ...source.production,
        entries: {
          [id]: { anchorAt: START, claimedCycles: 0, bankedCoins: 0 },
        },
      },
    };
    expect(() => parseSaveResult(downgraded, START)).toThrow(
      "production incorrecte",
    );
  });

  it.each([-1, 0.5, NaN, Infinity, 73])(
    "refuse un montant mis en réserve invalide : %s",
    (bankedCoins) => {
      const migrated = parseSaveResult(legacy(), START).state;
      const id = migrated.constructions[0].id;
      const invalid = {
        ...migrated,
        production: {
          ...migrated.production!,
          entries: {
            [id]: { ...migrated.production!.entries[id], bankedCoins },
          },
        },
      };
      expect(() => parseSaveResult(invalid, START)).toThrow(
        "production incorrecte",
      );
    },
  );

  it("arrondit la fraction à la milliseconde sans donner la récolte avant son échéance", () => {
    const recipe = RECIPE_BY_ID.get("high-citadel")!;
    const now = START + DAY - 1;
    const migrated = parseSaveResult(legacy(recipe.id), now).state;
    const next = getProduction(migrated, now).nextReadyAt!;
    expect(next).toBeGreaterThan(now);
    expect(next - now).toBeLessThanOrEqual(1);
    expect(getProduction(migrated, now).totalReady).toBe(0);
    expect(getProduction(migrated, next).totalReady).toBe(
      productionPerCycle(recipe),
    );
  });
});
