import { describe, expect, it } from "vitest";
import type { Construction } from "../game/engine";
import type { ProductionRow } from "../game/production";
import {
  groupConstructionStacks,
  productionCountdown,
  stackProduction,
} from "./productionView";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");

function construction(
  id: string,
  recipeId = "plan-a",
  pieces: Record<string, number> = { "brigo-1": 2 },
): Construction {
  return Object.freeze({
    id,
    recipeId,
    createdAt: "2026-10-15T12:00:00.000Z",
    pieces: Object.freeze(pieces),
  });
}

function row(
  built: Construction,
  changes: Partial<ProductionRow> = {},
): ProductionRow {
  return Object.freeze({
    constructionId: built.id,
    recipeId: built.recipeId,
    ready: 5,
    perCycle: 5,
    cycleMs: 3_600_000,
    perDay: 5,
    capacity: 15,
    nextReadyAt: NOW + 60_000,
    capacityBlocked: false,
    clockAdjusted: false,
    ...changes,
  });
}

describe("piles des constructions exposées", () => {
  it("fusionne les copies d’un même plan en conservant l’ordre de première apparition des plans et de leurs exemplaires", () => {
    const b1 = construction("b1", "plan-b");
    const a1 = construction("a1");
    const b2 = construction("b2", "plan-b", { "brigo-2": 4 });
    const c1 = construction("c1", "plan-c");
    const a2 = construction("a2", "plan-a", { "brigo-3": 7 });
    const source = Object.freeze([b1, a1, b2, c1, a2]);

    const stacks = groupConstructionStacks(source);

    expect(stacks.map((stack) => stack.recipeId)).toEqual([
      "plan-b",
      "plan-a",
      "plan-c",
    ]);
    expect(
      stacks.map((stack) => stack.constructions.map((item) => item.id)),
    ).toEqual([["b1", "b2"], ["a1", "a2"], ["c1"]]);
    expect(stacks[0].constructions[0]).toBe(b1);
    expect(stacks[0].constructions[1]).toBe(b2);
    expect(stacks[1].constructions[0]).toBe(a1);
    expect(stacks[1].constructions[1]).toBe(a2);
    expect(stacks[2].constructions[0]).toBe(c1);
    expect(source).toEqual([b1, a1, b2, c1, a2]);
  });

  it("garde chaque exemplaire exact et ses matériaux sans les mélanger entre les copies", () => {
    const first = construction("first", "plan-a", {
      "brigo-rouge": 3,
      "brigo-bleu": 1,
    });
    const second = construction("second", "plan-a", {
      "brigo-rouge": 1,
      "brigo-vert": 3,
    });
    const materialsBefore = [first.pieces, second.pieces];
    const [stack] = groupConstructionStacks(Object.freeze([first, second]));

    expect(stack.constructions).toHaveLength(2);
    expect(stack.constructions[0]).toBe(first);
    expect(stack.constructions[1]).toBe(second);
    expect(stack.constructions[0].pieces).toBe(materialsBefore[0]);
    expect(stack.constructions[1].pieces).toBe(materialsBefore[1]);
    expect(first.pieces).toEqual({ "brigo-rouge": 3, "brigo-bleu": 1 });
    expect(second.pieces).toEqual({ "brigo-rouge": 1, "brigo-vert": 3 });
  });

  it("ne conserve aucun regroupement d’un appel précédent après démontage", () => {
    const first = construction("first");
    const second = construction("second");
    const initial = groupConstructionStacks([first, second]);
    const afterDismantling = groupConstructionStacks([second]);

    expect(initial[0].constructions).toEqual([first, second]);
    expect(afterDismantling[0].constructions).toEqual([second]);
    expect(afterDismantling[0].constructions[0]).toBe(second);
    expect(groupConstructionStacks([])).toEqual([]);
  });
});

describe("récolte consolidée d’une pile", () => {
  it("additionne les pièces, le rendement et la capacité de ses seules copies et choisit le premier cycle à venir", () => {
    const first = construction("first");
    const second = construction("second");
    const third = construction("third");
    const outside = construction("outside", "plan-b");
    const [stack] = groupConstructionStacks([first, second, third]);
    const rows: ReadonlyMap<string, ProductionRow> = new Map([
      [first.id, row(first, { ready: 15, nextReadyAt: null })],
      [second.id, row(second, { ready: 0, nextReadyAt: NOW + 120_000 })],
      [third.id, row(third, { ready: 10, nextReadyAt: NOW + 30_000 })],
      [
        outside.id,
        row(outside, {
          ready: 60,
          perDay: 20,
          capacity: 60,
          nextReadyAt: NOW + 1000,
        }),
      ],
    ]);
    const originalRows = [...rows.entries()];

    expect(stackProduction(stack, rows)).toEqual({
      ready: 25,
      perDay: 15,
      capacity: 45,
      nextReadyAt: NOW + 30_000,
    });
    expect([...rows.entries()]).toEqual(originalRows);
    expect(stack.constructions).toEqual([first, second, third]);
  });

  it("garde la réserve maximale et aucun nouveau délai quand toutes les copies sont pleines", () => {
    const first = construction("first");
    const second = construction("second");
    const [stack] = groupConstructionStacks([first, second]);
    const result = stackProduction(
      stack,
      new Map([
        [first.id, row(first, { ready: 15, nextReadyAt: null })],
        [second.id, row(second, { ready: 15, nextReadyAt: null })],
      ]),
    );

    expect(result).toEqual({
      ready: 30,
      perDay: 10,
      capacity: 30,
      nextReadyAt: null,
    });
    expect(productionCountdown(result.nextReadyAt, NOW)).toBe("Réserve pleine");
  });

  it("ignore une copie dont les informations ne sont pas encore disponibles sans inventer de monnaie", () => {
    const first = construction("first");
    const missing = construction("missing");
    const [stack] = groupConstructionStacks([first, missing]);
    expect(stackProduction(stack, new Map([[first.id, row(first)]]))).toEqual({
      ready: 5,
      perDay: 5,
      capacity: 15,
      nextReadyAt: NOW + 60_000,
    });
    expect(stackProduction(stack, new Map())).toEqual({
      ready: 0,
      perDay: 0,
      capacity: 0,
      nextReadyAt: null,
    });
  });
});

describe("compte à rebours des récoltes", () => {
  it.each([
    [-86_400_000, "00:00:00"],
    [-1, "00:00:00"],
    [0, "00:00:00"],
    [1, "00:00:01"],
    [1000, "00:00:01"],
    [1001, "00:00:02"],
    [59_000, "00:00:59"],
    [59_001, "00:01:00"],
    [60_000, "00:01:00"],
    [3_599_000, "00:59:59"],
    [3_599_001, "01:00:00"],
    [3_600_000, "01:00:00"],
    [86_400_000, "24:00:00"],
    [259_200_000, "72:00:00"],
  ])("affiche le délai de %i ms comme %s", (remaining, expected) => {
    expect(productionCountdown(NOW + remaining, NOW)).toBe(expected);
  });

  it("annonce la réserve pleine au lieu d’une durée quand le plafond suspend la production", () => {
    expect(productionCountdown(null, NOW)).toBe("Réserve pleine");
  });
});
