import { describe, expect, it } from "vitest";
import { RECIPES } from "./catalog";
import {
  adminCommand,
  createGame,
  inventoryCount,
  recipeProgress,
} from "./engine";
import { orderRecipeParts, PART_PRICES, recipeOrderQuote } from "./market";
import { RECYCLE_VALUES } from "./recycling";

describe("comptoir des pièces de construction", () => {
  it.each(RECIPES.map((recipe) => [recipe.id, recipe] as const))(
    "commande exactement les pièces manquantes pour %s",
    (_id, recipe) => {
      const state = { ...createGame(), coins: 1_000_000 };
      const quote = recipeOrderQuote(state, recipe);
      const next = orderRecipeParts(state, recipe.id);
      expect(inventoryCount(next)).toBe(quote.count);
      expect(next.coins).toBe(state.coins - quote.cost);
      expect(recipeProgress(next, recipe).canBuild).toBe(true);
      expect(next.boxesOpened).toBe(0);
      expect(next.history).toEqual([]);
      expect(() => orderRecipeParts(next, recipe.id)).toThrow("déjà");
    },
  );
  it("utilise les exemplaires existants avant de facturer la commande", () => {
    const state = adminCommand(
      createGame(),
      { type: "piece", brigoId: "brick-2x2:blue", amount: 3 },
      true,
    );
    const quote = recipeOrderQuote(state, RECIPES[0]);
    expect(quote.count).toBe(2);
    expect(quote.cost).toBe(40);
    expect(inventoryCount(orderRecipeParts(state, "totem"))).toBe(5);
  });
  it("ne crédite rien si le solde est insuffisant ou le plan inconnu", () => {
    const state = { ...createGame(), coins: 0 };
    expect(() => orderRecipeParts(state, "totem")).toThrow("manque");
    expect(state.inventory).toEqual({});
    expect(() => orderRecipeParts(state, "__proto__")).toThrow("n’existe pas");
  });
  it("aucune pièce achetée ne peut être recyclée avec profit", () => {
    for (const rarity of Object.keys(
      PART_PRICES,
    ) as (keyof typeof PART_PRICES)[])
      expect(RECYCLE_VALUES[rarity]).toBeLessThan(PART_PRICES[rarity]);
  });
});
