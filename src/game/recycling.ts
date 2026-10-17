import { BRIGO_BY_ID } from "./catalog";
import type { Rarity } from "./catalog";
import { GameError, MAX_VALUE, reservedBrigoCount } from "./engine";
import type { GameState } from "./engine";

export const RECYCLE_VALUES: Record<Rarity, number> = {
  common: 8,
  uncommon: 14,
  rare: 25,
  epic: 50,
  legendary: 100,
};
export function recyclableCount(state: GameState, brigoId: string): number {
  if (!BRIGO_BY_ID.has(brigoId)) return 0;
  const available = state.inventory[brigoId] ?? 0;
  const reserved = reservedBrigoCount(state, brigoId);
  return Math.max(0, available - (reserved > 0 ? 0 : 1));
}
export function recycleBrigos(
  state: GameState,
  brigoId: string,
  amount: number,
): GameState {
  const brigo = BRIGO_BY_ID.get(brigoId);
  if (!brigo) throw new GameError("Cette pièce n’existe pas.");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000)
    throw new GameError("Saisissez un entier entre 1 et 100000.");
  if (amount > recyclableCount(state, brigoId))
    throw new GameError(
      "Gardez au moins un exemplaire de cette référence. Les pièces de vos créations ne peuvent pas être recyclées.",
    );
  const reward = amount * RECYCLE_VALUES[brigo.rarity];
  if (state.coins + reward > MAX_VALUE)
    throw new GameError("La réserve de pièces est pleine.");
  const inventory = { ...state.inventory };
  inventory[brigoId] -= amount;
  if (inventory[brigoId] === 0) delete inventory[brigoId];
  return { ...state, inventory, coins: state.coins + reward };
}
