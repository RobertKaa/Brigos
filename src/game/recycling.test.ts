import { describe, expect, it } from "vitest";
import { BOXES, BOX_IDS, BY_RARITY, RARITIES } from "./catalog";
import { adminCommand, buildRecipe, createGame, MAX_VALUE } from "./engine";
import { recyclableCount, recycleBrigos, RECYCLE_VALUES } from "./recycling";

describe("recyclage des doublons", () => {
  it("transforme uniquement les exemplaires supplémentaires en monnaie", () => {
    const state = adminCommand(
      createGame(),
      { type: "piece", brigoId: "brick-1x1:coral", amount: 5 },
      true,
    );
    const next = recycleBrigos(state, "brick-1x1:coral", 4);
    expect(next.inventory["brick-1x1:coral"]).toBe(1);
    expect(next.coins).toBe(state.coins + 32);
    expect(next.discovered).toEqual(state.discovered);
    expect(state.inventory["brick-1x1:coral"]).toBe(5);
    expect(() => recycleBrigos(next, "brick-1x1:coral", 1)).toThrow("Gardez");
  });
  it("conserve les pièces réservées même quand tous les doublons libres sont recyclés", () => {
    let state = adminCommand(
      createGame(),
      { type: "recipe", recipeId: "totem" },
      true,
    );
    state = adminCommand(
      state,
      { type: "piece", brigoId: "brick-2x2:coral", amount: 3 },
      true,
    );
    state = buildRecipe(state, "totem");
    expect(recyclableCount(state, "brick-2x2:coral")).toBe(3);
    const next = recycleBrigos(state, "brick-2x2:coral", 3);
    expect(next.inventory["brick-2x2:coral"]).toBeUndefined();
    expect(next.constructions).toEqual(state.constructions);
  });
  it.each([0, -1, 1.1, NaN, Infinity, 100001])(
    "refuse une quantité invalide (%s)",
    (amount) => {
      expect(() =>
        recycleBrigos(createGame(), "brick-1x1:coral", amount),
      ).toThrow("entier");
    },
  );
  it("refuse les références étrangères et les dépassements sans modifier la partie", () => {
    expect(() => recycleBrigos(createGame(), "__proto__", 1)).toThrow(
      "n’existe pas",
    );
    const state = {
      ...createGame(),
      coins: MAX_VALUE,
      inventory: { "brick-1x1:coral": 2 },
    };
    expect(() => recycleBrigos(state, "brick-1x1:coral", 1)).toThrow("pleine");
    expect(state.inventory["brick-1x1:coral"]).toBe(2);
  });
  it("ne finance pas une boucle rentable d’ouverture puis recyclage", () => {
    for (const boxId of BOX_IDS) {
      const expected =
        5 *
        RARITIES.reduce(
          (sum, rarity) =>
            sum + (BOXES[boxId].weights[rarity] / 100) * RECYCLE_VALUES[rarity],
          0,
        );
      expect(expected).toBeLessThan(BOXES[boxId].cost);
      expect(RARITIES.every((rarity) => BY_RARITY[rarity].length > 0)).toBe(
        true,
      );
    }
  });
});
