import { CATALOG, RECIPE_BY_ID } from "./catalog";
import type { Rarity, Recipe } from "./catalog";
import {
  GameError,
  MAX_VALUE,
  matchesRequirement,
  recipeProgress,
} from "./engine";
import type { GameState } from "./engine";

export const PART_PRICES: Record<Rarity, number> = {
  common: 20,
  uncommon: 35,
  rare: 65,
  epic: 140,
  legendary: 300,
};
export function recipeOrderQuote(state: GameState, recipe: Recipe) {
  const progress = recipeProgress(state, recipe);
  const pieces: Record<string, number> = {};
  let cost = 0;
  let count = 0;
  for (const requirement of progress.requirements) {
    if (!requirement.missing) continue;
    const brigo = CATALOG.find((candidate) =>
      matchesRequirement(candidate, requirement),
    );
    if (!brigo) throw new GameError("Une pièce de ce plan est indisponible.");
    pieces[brigo.id] = (pieces[brigo.id] ?? 0) + requirement.missing;
    cost += PART_PRICES[brigo.rarity] * requirement.missing;
    count += requirement.missing;
  }
  return { pieces, cost, count, canAfford: state.coins >= cost };
}
export function orderRecipeParts(
  state: GameState,
  recipeId: string,
): GameState {
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe) throw new GameError("Ce plan n’existe pas.");
  const quote = recipeOrderQuote(state, recipe);
  if (!quote.count)
    throw new GameError("Vous avez déjà toutes les pièces de ce plan.");
  if (!quote.canAfford)
    throw new GameError("Il vous manque des pièces pour cette commande.");
  const inventory = { ...state.inventory };
  const discovered = new Set(state.discovered);
  for (const [id, amount] of Object.entries(quote.pieces)) {
    if ((inventory[id] ?? 0) + amount > MAX_VALUE)
      throw new GameError("L’inventaire de ce Brigo est plein.");
    inventory[id] = (inventory[id] ?? 0) + amount;
    discovered.add(id);
  }
  return {
    ...state,
    coins: state.coins - quote.cost,
    inventory,
    discovered: [...discovered],
  };
}
