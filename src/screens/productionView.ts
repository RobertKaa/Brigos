import type { Construction } from "../game/engine";
import type { ProductionRow } from "../game/production";

export interface ConstructionStack {
  recipeId: string;
  constructions: Construction[];
}

export function groupConstructionStacks(
  constructions: readonly Construction[],
): ConstructionStack[] {
  const groups = new Map<string, ConstructionStack>();
  for (const construction of constructions) {
    const group = groups.get(construction.recipeId);
    if (group) group.constructions.push(construction);
    else
      groups.set(construction.recipeId, {
        recipeId: construction.recipeId,
        constructions: [construction],
      });
  }
  return [...groups.values()];
}

export function stackProduction(
  stack: ConstructionStack,
  rows: ReadonlyMap<string, ProductionRow>,
) {
  let ready = 0,
    perDay = 0,
    capacity = 0;
  let nextReadyAt: number | null = null;
  for (const construction of stack.constructions) {
    const row = rows.get(construction.id);
    if (!row) continue;
    ready += row.ready;
    perDay += row.perDay;
    capacity += row.capacity;
    if (row.nextReadyAt !== null)
      nextReadyAt =
        nextReadyAt === null
          ? row.nextReadyAt
          : Math.min(nextReadyAt, row.nextReadyAt);
  }
  return { ready, perDay, capacity, nextReadyAt };
}

export function productionCountdown(
  nextAt: number | null,
  now: number,
): string {
  if (nextAt === null) return "Réserve pleine";
  const seconds = Math.max(0, Math.ceil((nextAt - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
