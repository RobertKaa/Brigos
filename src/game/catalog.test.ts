import { describe, expect, it } from "vitest";
import {
  BOXES,
  BOX_IDS,
  BY_RARITY,
  CATALOG,
  COLORS,
  MODELS,
  RARITIES,
  RECIPES,
  pieceCount,
  ACTIVE_CATALOG,
  albumCatalog,
} from "./catalog";
import {
  adminCommand,
  createGame,
  recipeProgress,
  validateWeights,
} from "./engine";

describe("catalogue de lancement", () => {
  it("offre 58 modèles et 580 références distinctes réparties sur 10 couleurs", () => {
    expect(MODELS).toHaveLength(58);
    expect(COLORS).toHaveLength(10);
    expect(CATALOG).toHaveLength(580);
    expect(new Set(CATALOG.map((brigo) => brigo.id)).size).toBe(580);
    expect(new Set(CATALOG.map((brigo) => brigo.number)).size).toBe(580);
    for (const model of MODELS)
      expect(
        CATALOG.filter((brigo) => brigo.model.id === model.id),
      ).toHaveLength(10);
  });
  it("rend toutes les raretés et toutes les références actives obtenables", () => {
    for (const rarity of RARITIES)
      expect(BY_RARITY[rarity].length).toBeGreaterThan(0);
    expect(RARITIES.flatMap((rarity) => BY_RARITY[rarity])).toHaveLength(550);
    expect(ACTIVE_CATALOG).toHaveLength(550);
    for (const id of BOX_IDS) {
      expect(validateWeights(BOXES[id].weights)).toBe(true);
      for (const rarity of RARITIES)
        expect(BOXES[id].weights[rarity]).toBeGreaterThan(0);
    }
  });
  it("conserve les cônes déjà découverts comme archives sans les imposer au nouvel album", () => {
    expect(albumCatalog([])).toHaveLength(550);
    const album = albumCatalog(["cone-6x6:green"]);
    expect(album).toHaveLength(551);
    expect(album.some((piece) => piece.id === "cone-6x6:green")).toBe(true);
    expect(
      RARITIES.flatMap((rarity) => BY_RARITY[rarity]).every(
        (piece) => !piece.model.archived,
      ),
    ).toBe(true);
  });
  it("ne contient que des dimensions valides et des couleurs hexadécimales sûres", () => {
    for (const brigo of CATALOG) {
      expect(brigo.model.width).toBeGreaterThan(0);
      expect(brigo.model.depth).toBeGreaterThan(0);
      expect(brigo.model.height).toBeGreaterThan(0);
      expect(brigo.color.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it("propose au moins treize recettes réalisables dont un premier plan utilisant des briques communes", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(13);
    for (const recipe of RECIPES) {
      const supplied = adminCommand(
        createGame(),
        { type: "recipe", recipeId: recipe.id },
        true,
      );
      expect(recipeProgress(supplied, recipe).canBuild).toBe(true);
      expect(
        Object.values(supplied.inventory).reduce(
          (sum, count) => sum + count,
          0,
        ),
      ).toBe(pieceCount(recipe));
    }
    const starter = adminCommand(
      createGame(),
      { type: "recipe", recipeId: "totem" },
      true,
    );
    expect(
      starter.discovered.every(
        (id) => CATALOG.find((brigo) => brigo.id === id)!.rarity === "common",
      ),
    ).toBe(true);
  });
  it("attribue la rareté à la forme et préserve les anciennes références", () => {
    for (const model of MODELS) {
      const variants = CATALOG.filter((brigo) => brigo.model.id === model.id);
      expect(new Set(variants.map((brigo) => brigo.rarity)).size).toBe(1);
      expect(variants[0].rarity).toBe(RARITIES[model.tier]);
    }
    expect(CATALOG[34].id).toBe("brick-2x2:blue");
    expect(CATALOG[319].id).toBe("special-cross:charcoal");
    for (const [index, model] of MODELS.slice(0, 51).entries()) {
      for (const [colorIndex, color] of COLORS.slice(0, 8).entries()) {
        const original = CATALOG[index * 8 + colorIndex];
        expect(original.id).toBe(`${model.id}:${color.id}`);
        expect(original.number).toBe(index * 8 + colorIndex + 1);
      }
    }
    expect(CATALOG[408].id).toBe("brick-1x1:brown");
    expect(CATALOG[509].number).toBe(510);
    expect(CATALOG[510].id).toBe("cone-2x2:coral");
    expect(CATALOG[539].id).toBe("cone-6x6:green");
    expect(CATALOG[540].id).toBe("special-wheel:coral");
    expect(CATALOG[569].id).toBe("special-hinge:green");
    expect(CATALOG[570]).toMatchObject({
      id: "special-bearing:coral",
      number: 571,
    });
    expect(CATALOG[579]).toMatchObject({
      id: "special-bearing:green",
      number: 580,
    });
  });
  it("rend les nouveaux mécanismes obtenables sans réaffecter les références historiques", () => {
    for (const modelId of [
      "special-wheel",
      "special-axle",
      "special-hinge",
      "special-bearing",
    ]) {
      const mechanisms = ACTIVE_CATALOG.filter(
        (brigo) => brigo.model.id === modelId,
      );
      expect(mechanisms).toHaveLength(10);
      expect(mechanisms.every((brigo) => brigo.number > 540)).toBe(true);
      for (const brigo of mechanisms)
        expect(BY_RARITY[brigo.rarity]).toContain(brigo);
    }
  });
  it("ajoute un palier traversant peu commun après tous les anciens modèles", () => {
    expect(MODELS.at(-1)).toEqual({
      id: "special-bearing",
      name: "Palier Losange",
      family: "special",
      shape: "bearing",
      width: 2,
      depth: 2,
      height: 2,
      studs: true,
      tier: 1,
    });
    expect(
      CATALOG.filter((brigo) => brigo.model.shape === "bearing").every(
        (brigo) => brigo.rarity === "uncommon",
      ),
    ).toBe(true);
  });
});
