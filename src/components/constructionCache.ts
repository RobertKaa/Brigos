/** In-memory LRU with both entry and weight limits; never touches player saves. */
export function createConstructionCache<T>(
  maxEntries: number,
  maxWeight: number,
) {
  const entries = new Map<string, { value: T; weight: number }>();
  let weight = 0;
  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key: string, value: T, entryWeight = 1): T {
      const previous = entries.get(key);
      if (previous) {
        weight -= previous.weight;
        entries.delete(key);
      }
      if (entryWeight > maxWeight || maxEntries < 1) return value;
      entries.set(key, { value, weight: entryWeight });
      weight += entryWeight;
      while (entries.size > maxEntries || weight > maxWeight) {
        const oldest = entries.keys().next().value!;
        weight -= entries.get(oldest)!.weight;
        entries.delete(oldest);
      }
      return value;
    },
    get size() {
      return entries.size;
    },
    get weight() {
      return weight;
    },
  };
}
