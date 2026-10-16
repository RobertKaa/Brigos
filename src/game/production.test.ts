import { describe, expect, it } from "vitest";
import { RECIPES, RECIPE_BY_ID } from "./catalog";
import {
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
  MAX_VALUE,
} from "./engine";
import type { GameState } from "./engine";
import { recipeOrderQuote } from "./market";
import {
  collectProduction,
  collectRecipeProduction,
  getProduction,
  observeProduction,
  parseProduction,
  PRODUCTION_CYCLE_MS,
  PRODUCTION_RESERVE_MS,
  productionPerCycle,
  recipeProductionIntervalMs,
  recipeProductionPerDay,
} from "./production";
import { parseSaveResult, parseSave } from "./save";

const START = Date.parse("2026-10-19T10:00:00.000Z");
const CYCLE = recipeProductionIntervalMs(RECIPE_BY_ID.get("totem")!);
const yieldFor = (id = "totem") => productionPerCycle(RECIPE_BY_ID.get(id)!);
function build(
  state = createGame(),
  recipeId = "totem",
  at = START,
): GameState {
  return buildRecipe(
    adminCommand(state, { type: "recipe", recipeId }, true),
    recipeId,
    at,
  );
}

describe("pièces produites par les constructions sur plan", () => {
  it("attend un cycle entier après la création, y compris avec zéro monnaie", () => {
    const state = { ...build(), coins: 0 };
    const before = structuredClone(state);
    expect(getProduction(state, START + CYCLE - 1)).toMatchObject({
      totalReady: 0,
      nextReadyAt: START + CYCLE,
      producingCount: 1,
    });
    expect(getProduction(state, START + CYCLE).totalReady).toBe(yieldFor());
    const collected = collectProduction(state, undefined, START + CYCLE);
    expect(collected.coins).toBe(yieldFor());
    expect(collected.inventory).toBe(state.inventory);
    expect(collected.discovered).toBe(state.discovered);
    expect(collected.boxesOpened).toBe(state.boxesOpened);
    expect(collected.engagement).toBe(state.engagement);
    expect(state).toEqual(before);
  });

  it("calcule les rendements sur le tarif de référence du plan, sans RNG", () => {
    for (const recipe of RECIPES) {
      const quote = recipeOrderQuote(
        { ...createGame(), inventory: {} },
        recipe,
      );
      expect(recipeProductionPerDay(recipe)).toBe(
        (Math.max(
          1,
          Math.floor(
            (Math.min(96, 24 + Math.floor(Math.sqrt(quote.cost) / 5)) *
              recipeProductionIntervalMs(recipe)) /
              PRODUCTION_CYCLE_MS,
          ),
        ) *
          PRODUCTION_CYCLE_MS) /
          recipeProductionIntervalMs(recipe),
      );
    }
    expect(yieldFor()).toBe(1);
    expect(yieldFor("high-citadel")).toBeGreaterThan(yieldFor());
  });

  it("additionne tous les exemplaires et garde leur propre échéance", () => {
    const one = build();
    const two = build(one, "totem", START + CYCLE / 2);
    const summary = getProduction(two, START + CYCLE);
    expect(summary.totalPerDay).toBe(
      recipeProductionPerDay(RECIPE_BY_ID.get("totem")!) * 2,
    );
    expect(summary.totalReady).toBe(yieldFor());
    expect(summary.rows.map((row) => row.ready)).toEqual([yieldFor(), 0]);
    expect(summary.nextReadyAt).toBe(START + CYCLE * 1.5);
    expect(getProduction(two, START + CYCLE * 1.5).totalReady).toBe(
      yieldFor() * 2,
    );
  });

  it("récolte toute une pile de plan en laissant les autres plans intacts", () => {
    const state = build(build(build(), "totem"), "tree");
    const now = START + CYCLE;
    const before = structuredClone(state);
    const collected = collectRecipeProduction(state, "totem", now);
    expect(collected.coins - state.coins).toBe(yieldFor() * 2);
    expect(getProduction(collected, now).totalReady).toBe(yieldFor("tree"));
    expect(collectRecipeProduction(collected, "totem", now).coins).toBe(
      collected.coins,
    );
    expect(state).toEqual(before);
  });

  it("récolte un seul exemplaire sans créditer son doublon", () => {
    const state = build(build());
    const collected = collectProduction(
      state,
      state.constructions[0].id,
      START + CYCLE,
    );
    expect(collected.coins - state.coins).toBe(yieldFor());
    expect(
      getProduction(collected, START + CYCLE).rows.map((row) => row.ready),
    ).toEqual([0, yieldFor()]);
  });

  it("conserve la fraction de cycle en récoltant", () => {
    const state = build();
    const collected = collectProduction(state, undefined, START + CYCLE * 1.5);
    expect(getProduction(collected, START + CYCLE * 2 - 1).totalReady).toBe(0);
    expect(getProduction(collected, START + CYCLE * 2).totalReady).toBe(
      yieldFor(),
    );
    expect(getProduction(collected, START + CYCLE * 1.5).nextReadyAt).toBe(
      START + CYCLE * 2,
    );
  });

  it("plafonne une absence à trois journées, sans récupérer l’excédent au second clic", () => {
    const state = build();
    const now = START + CYCLE * 100.5;
    const summary = getProduction(state, now);
    expect(summary.totalReady).toBe(
      (yieldFor() * PRODUCTION_RESERVE_MS) / CYCLE,
    );
    expect(summary.rows[0]).toMatchObject({
      capacity: (yieldFor() * PRODUCTION_RESERVE_MS) / CYCLE,
      nextReadyAt: null,
    });
    const collected = collectProduction(state, undefined, now);
    expect(collectProduction(collected, undefined, now).coins).toBe(
      collected.coins,
    );
    expect(getProduction(collected, START + CYCLE * 101).totalReady).toBe(
      yieldFor(),
    );
  });

  it("bloque le rejeu de cycles après un recul de l’horloge", () => {
    const state = collectProduction(build(), undefined, START + CYCLE * 2);
    expect(getProduction(state, START + CYCLE).clockAdjusted).toBe(true);
    expect(getProduction(state, START + CYCLE).totalReady).toBe(0);
    const retry = collectProduction(state, undefined, START + CYCLE);
    expect(retry.coins).toBe(state.coins);
    expect(retry.production?.observedAt).toBe(START + CYCLE * 2);
    expect(getProduction(retry, START + CYCLE * 3).totalReady).toBe(yieldFor());
  });

  it("autorise les pièces déjà mûres au high-water mark sans produire deux fois", () => {
    const state = observeProduction(build(), START + CYCLE * 2);
    const collected = collectProduction(state, undefined, START + CYCLE);
    expect(collected.coins - state.coins).toBe(yieldFor() * 2);
    expect(getProduction(collected, START + CYCLE * 2).totalReady).toBe(0);
  });

  it("collecte les pièces mûres et restitue uniquement les matériaux réservés au démontage", () => {
    const state = build();
    const built = state.constructions[0];
    const next = dismantle(state, built.id, START + CYCLE);
    expect(next.coins - state.coins).toBe(yieldFor());
    expect(next.inventory).toEqual(built.pieces);
    expect(next.discovered).toBe(state.discovered);
    expect(next.production?.entries).toEqual({});
    const rebuilt = buildRecipe(next, "totem", START + CYCLE);
    expect(rebuilt.constructions[0].id).not.toBe(built.id);
    expect(getProduction(rebuilt, START + CYCLE * 2 - 1).totalReady).toBe(0);
  });

  it("ne produit rien en plaçant puis démontant immédiatement", () => {
    const state = build();
    const next = dismantle(state, state.constructions[0].id, START);
    expect(next.coins).toBe(state.coins);
    expect(getProduction(next, START + CYCLE * 10).totalReady).toBe(0);
  });

  it("ne rémunère pas les projets du bac à sable", () => {
    const state: GameState = {
      ...createGame(),
      sandboxProjects: [
        {
          id: "free",
          name: "Libre",
          createdAt: new Date(START).toISOString(),
          updatedAt: new Date(START).toISOString(),
          placements: [],
        },
      ],
    };
    expect(getProduction(state, START + CYCLE * 10)).toMatchObject({
      totalReady: 0,
      producingCount: 0,
      totalPerDay: 0,
      nextReadyAt: null,
    });
  });

  it("ne laisse aucun crédit ni marqueur partiel au plafond de monnaie", () => {
    const state = { ...build(build()), coins: MAX_VALUE - yieldFor() };
    const original = structuredClone(state);
    expect(getProduction(state, START + CYCLE).capacityBlocked).toBe(true);
    expect(
      getProduction(state, START + CYCLE).rows.every(
        (row) => !row.capacityBlocked,
      ),
    ).toBe(true);
    expect(() => collectProduction(state, undefined, START + CYCLE)).toThrow(
      "réserve de pièces",
    );
    expect(() =>
      collectRecipeProduction(state, "totem", START + CYCLE),
    ).toThrow("réserve de pièces");
    expect(state).toEqual(original);
    const one = collectProduction(
      state,
      state.constructions[0].id,
      START + CYCLE,
    );
    expect(one.coins).toBe(MAX_VALUE);
  });

  it("refuse les demandes inconnues et les dates hors limites", () => {
    expect(() => collectProduction(build(), "missing", START)).toThrow(
      "atelier",
    );
    expect(() => collectRecipeProduction(build(), "__proto__", START)).toThrow(
      "atelier",
    );
    for (const now of [NaN, Infinity, -1, 1.2, Number.MAX_SAFE_INTEGER]) {
      expect(() => getProduction(build(), now)).toThrow("heure");
      expect(() => collectProduction(build(), undefined, now)).toThrow("heure");
    }
  });
});

describe("validation et migration des marqueurs de production", () => {
  it("active les constructions de la v8 maintenant, sans rétroactivité", () => {
    const state = build();
    const legacy = { ...state, version: 8, production: undefined };
    const now = START + CYCLE * 50;
    const migrated = parseSaveResult(legacy, now).state;
    expect(migrated.version).toBe(10);
    expect(migrated.constructions).toEqual(state.constructions);
    expect(migrated.inventory).toEqual(state.inventory);
    expect(getProduction(migrated, now).totalReady).toBe(0);
    expect(getProduction(migrated, now + CYCLE).totalReady).toBe(yieldFor());
  });

  it("initialise une entrée absente à l’observation sans modifier la source à l’affichage", () => {
    const state = { ...build(), production: { observedAt: 0, entries: {} } };
    const before = structuredClone(state);
    const now = START + CYCLE * 10;
    expect(getProduction(state, now).totalReady).toBe(0);
    expect(state).toEqual(before);
    const parsed = parseSaveResult(state, now).state;
    expect(getProduction(parsed, now).nextReadyAt).toBe(now + CYCLE);
    expect(parseSave(parsed)).toEqual(parsed);
  });

  it("refuse un schéma actuel sans production et un schéma abaissé avec marqueurs", () => {
    const state = build();
    expect(() => parseSave({ ...state, production: undefined })).toThrow(
      "production",
    );
    expect(() => parseSave({ ...state, version: 8 })).toThrow(
      "production incompatible",
    );
  });

  it("conserve les marqueurs valides sans les modifier selon la date courante", () => {
    const state = collectProduction(build(), undefined, START + CYCLE);
    expect(parseSaveResult(state, START + CYCLE * 10).state).toEqual(state);
  });

  it("gère les identifiants qui ressemblent aux propriétés du prototype", () => {
    const original = build();
    const state = {
      ...original,
      constructions: [{ ...original.constructions[0], id: "constructor" }],
      production: { observedAt: START, entries: {} },
    };
    const normalized = observeProduction(state, START);
    expect(Object.hasOwn(normalized.production!.entries, "constructor")).toBe(
      true,
    );
    expect(getProduction(normalized, START + CYCLE).totalReady).toBe(
      yieldFor(),
    );
    expect(parseSaveResult(normalized, START).state.production).toEqual(
      normalized.production,
    );
  });

  it.each([
    null,
    [],
    {},
    { observedAt: NaN, entries: {} },
    { observedAt: -1, entries: {} },
    { observedAt: START, entries: [] },
    {
      observedAt: START,
      entries: { unknown: { anchorAt: START, claimedCycles: 0 } },
    },
  ])("refuse un ledger mal formé (%j)", (value) => {
    expect(() => parseProduction(value, build().constructions, START)).toThrow(
      "production incorrecte",
    );
  });

  it.each([
    { anchorAt: START + 1, claimedCycles: 0 },
    { anchorAt: START, claimedCycles: -1 },
    { anchorAt: START, claimedCycles: 0.5 },
    { anchorAt: START, claimedCycles: 1 },
    { anchorAt: START, claimedCycles: Number.MAX_SAFE_INTEGER },
    { anchorAt: "2026-10-19", claimedCycles: 0 },
  ])("refuse un compteur de cycles incohérent (%j)", (entry) => {
    const built = build();
    expect(() =>
      parseProduction(
        { observedAt: START, entries: { [built.constructions[0].id]: entry } },
        built.constructions,
        START,
      ),
    ).toThrow("production incorrecte");
  });
});
