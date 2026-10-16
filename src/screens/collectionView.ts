import { RARITIES } from "../game/catalog";
import type { Brigo } from "../game/catalog";

export type CollectionStatus = "all" | "owned" | "missing" | "duplicates";
export type CollectionSort = "number" | "quantity" | "rarity" | "name";

/** Both free and assembled pieces remain part of the player's collection. */
export function collectionSummary(
  album: readonly Brigo[],
  inventory: Record<string, number>,
  reserved: Record<string, number>,
  discovered: readonly string[],
) {
  const known = new Set(discovered);
  const summary = {
    all: album.length,
    discovered: 0,
    owned: 0,
    missing: 0,
    duplicates: 0,
    spareCopies: 0,
  };
  for (const brigo of album) {
    const copies = (inventory[brigo.id] ?? 0) + (reserved[brigo.id] ?? 0);
    if (known.has(brigo.id)) summary.discovered++;
    else summary.missing++;
    if (copies > 0) summary.owned++;
    if (copies > 1) summary.duplicates++;
    summary.spareCopies += Math.max(0, copies - 1);
  }
  return summary;
}

export function sortCollection(
  brigos: readonly Brigo[],
  sort: CollectionSort,
  inventory: Record<string, number>,
  reserved: Record<string, number>,
) {
  const copies = (brigo: Brigo) =>
    (inventory[brigo.id] ?? 0) + (reserved[brigo.id] ?? 0);
  return [...brigos].sort((a, b) => {
    const difference =
      sort === "quantity"
        ? copies(b) - copies(a)
        : sort === "rarity"
          ? RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)
          : sort === "name"
            ? a.model.name.localeCompare(b.model.name, "fr", { numeric: true })
            : 0;
    return difference || a.number - b.number;
  });
}
