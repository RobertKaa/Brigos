import { describe, expect, it } from "vitest";
import { createConstructionCache } from "./constructionCache";

describe("cache mémoire des dessins", () => {
  it("évince le moins récemment utilisé et respecte la limite de poids", () => {
    const cache = createConstructionCache<string>(3, 10);
    cache.set("a", "A", 3);
    cache.set("b", "B", 3);
    cache.set("c", "C", 3);
    expect(cache.get("a")).toBe("A");
    cache.set("d", "D", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.size).toBe(3);
    expect(cache.weight).toBe(9);
    cache.set("heavy", "H", 8);
    expect(cache.size).toBe(1);
    expect(cache.weight).toBe(8);
    expect(cache.get("heavy")).toBe("H");
  });

  it("actualise le poids d’une clé et refuse une entrée plus grande que le budget", () => {
    const cache = createConstructionCache<number>(2, 10);
    cache.set("frame", 1, 8);
    cache.set("frame", 2, 4);
    expect(cache.size).toBe(1);
    expect(cache.weight).toBe(4);
    expect(cache.get("frame")).toBe(2);
    expect(cache.set("oversized", 3, 11)).toBe(3);
    expect(cache.get("oversized")).toBeUndefined();
    expect(cache.get("frame")).toBe(2);
    expect(cache.weight).toBe(4);
  });
});
