import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RECIPES, RECIPE_BY_ID, pieceCount } from "./catalog";
import published from "./fixtures/published-v09-plan-digests.json";
import { WHEELED_ASSEMBLIES } from "./assemblies/wheeled";
import { ARTICULATED_ASSEMBLIES } from "./assemblies/articulated";
import { adminCommand, buildRecipe, createGame, dismantle } from "./engine";
import { parseSave } from "./save";
import { playerProgress, recipeXp } from "./progression";
import { getProduction } from "./production";

const additions = [...WHEELED_ASSEMBLIES, ...ARTICULATED_ASSEMBLIES];

describe("extension mécanique de la bibliothèque", () => {
  it("conserve les 65 plans publiés, leur ordre, leurs exigences et leur XP", () => {
    expect(published).toHaveLength(65);
    expect(
      RECIPES.slice(0, published.length).map((recipe) => recipe.id),
    ).toEqual(published.map((recipe) => recipe.id));
    for (const { id, digest } of published) {
      const recipe = RECIPE_BY_ID.get(id)!;
      expect(
        createHash("sha256")
          .update(
            JSON.stringify({
              difficulty: recipe.difficulty,
              placements: recipe.placements,
              requirements: recipe.requirements,
            }),
          )
          .digest("hex"),
        id,
      ).toBe(digest);
    }
    expect(RECIPES.slice(published.length).map((recipe) => recipe.id)).toEqual(
      additions.map((plan) => plan.id),
    );
  });

  for (const plan of additions) {
    it(`${plan.id} : réserve puis restitue les références exactes, avec XP et production cohérentes`, () => {
      const recipe = RECIPE_BY_ID.get(plan.id)!;
      expect(recipe).toBeDefined();
      let supplied = createGame();
      // Supply mixed rim and mechanism colours, not a pre-matched cosmetic set.
      for (const requirement of recipe.requirements) {
        for (let index = 0; index < requirement.quantity; index++) {
          const color = requirement.colorId ?? (index % 2 ? "mint" : "blue");
          supplied = adminCommand(
            supplied,
            {
              type: "piece",
              brigoId: `${requirement.modelId}:${color}`,
              amount: 1,
            },
            true,
          );
        }
      }
      const before = { ...supplied.inventory };
      const built = buildRecipe(supplied, recipe.id);
      const construction = built.constructions.at(-1)!;
      expect(
        Object.values(construction.pieces).reduce(
          (total, count) => total + count,
          0,
        ),
      ).toBe(pieceCount(recipe));
      expect(playerProgress(built).xp).toBe(recipeXp(recipe));
      const reloaded = parseSave(JSON.parse(JSON.stringify(built)));
      expect(reloaded.constructions.at(-1)?.pieces).toEqual(
        construction.pieces,
      );
      expect(
        getProduction(reloaded, Date.parse(construction.createdAt)).totalReady,
      ).toBe(0);
      const removed = dismantle(
        reloaded,
        construction.id,
        Date.parse(construction.createdAt),
      );
      expect(removed.inventory).toEqual(before);
      expect(removed.constructions).toHaveLength(0);
      expect(playerProgress(removed).xp).toBe(0);
    });
  }
});
