import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import published from "./fixtures/published-v06-digests.json";
import { RECIPES, pieceCount } from "./catalog";
import {
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
  followRecipe,
} from "./engine";
import { playerProgress, recipeXp } from "./progression";
import { importSave, parseSaveResult } from "./save";
import { V5_RECIPE_SNAPSHOTS } from "./v5RecipeSnapshots";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const canonical = (values: unknown[][]) =>
  values.sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b), "en"),
  );
const publishedIds = new Set(published.map((recipe) => recipe.id));
const additions = RECIPES.filter((recipe) => !publishedIds.has(recipe.id));
// This size contract belongs to the twenty historically published intermediate
// plans; later extensions can also introduce small or legendary projects.
const intermediateAdditions = additions.filter((recipe) =>
  Object.hasOwn(V5_RECIPE_SNAPSHOTS, recipe.id),
);

describe("historique de la bibliothèque publiée et extension intermédiaire", () => {
  it("conserve l’ordre des 45 plans précédents et ajoute au moins 20 étapes intermédiaires", () => {
    expect(published).toHaveLength(45);
    expect(
      Object.values(V5_RECIPE_SNAPSHOTS)
        .slice(0, published.length)
        .map((recipe) => recipe.id),
    ).toEqual(published.map((recipe) => recipe.id));
    expect(intermediateAdditions).toHaveLength(20);
    for (const recipe of intermediateAdditions) {
      expect(pieceCount(recipe), recipe.id).toBeGreaterThanOrEqual(50);
      expect(pieceCount(recipe), recipe.id).toBeLessThan(900);
      expect(recipe.difficulty, recipe.id).not.toBe("Légendaire");
    }
    for (const [min, max] of [
      [50, 149],
      [150, 299],
      [300, 499],
      [500, 899],
    ])
      expect(
        intermediateAdditions.some(
          (recipe) => pieceCount(recipe) >= min && pieceCount(recipe) <= max,
        ),
        `${min}–${max} Brigos`,
      ).toBe(true);
    expect(
      new Set(intermediateAdditions.map((recipe) => recipe.theme)).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(published)(
    "fige l’original $id : géométrie, pièces et difficulté",
    (snapshot) => {
      const recipe = V5_RECIPE_SNAPSHOTS[snapshot.id]!;
      expect(recipe).toBeDefined();
      expect(recipe.name).toBe(snapshot.name);
      expect(recipe.difficulty).toBe(snapshot.difficulty);
      expect(pieceCount(recipe)).toBe(snapshot.count);
      expect(
        hash(
          canonical(
            recipe.placements.map((part) => [
              part.modelId,
              part.colorId ?? null,
              part.x,
              part.y,
              part.z,
              part.rotation,
            ]),
          ),
        ),
      ).toBe(snapshot.geometry);
      expect(
        hash(
          canonical(
            recipe.requirements.map((part) => [
              part.modelId,
              part.colorId ?? null,
              part.quantity,
            ]),
          ),
        ),
      ).toBe(snapshot.materials);
    },
  );

  it("recharge une galerie courante des 45 identités historiques sans double restitution", () => {
    let state = createGame();
    for (const snapshot of published)
      state = buildRecipe(
        adminCommand(state, { type: "recipe", recipeId: snapshot.id }, true),
        snapshot.id,
      );
    state = {
      ...state,
      goalRecipeId: "astreval-gardens",
      claimedAchievements: ["builder-variety", "first-expert"],
      lastVisitRewardAt: "2026-10-09T08:00:00.000Z",
      preferences: { sound: true, reducedMotion: true },
    };
    const result = parseSaveResult(JSON.parse(JSON.stringify(state)));
    expect(result.state).toEqual(state);
    expect(result.migration).toBeUndefined();
    expect(playerProgress(result.state).xp).toBe(playerProgress(state).xp);
  });

  for (const recipe of additions) {
    it(`${recipe.id} : construit, sauvegarde et démonte en conservant toutes les références et l’XP`, () => {
      const supplied = followRecipe(
        adminCommand(
          createGame(),
          { type: "recipe", recipeId: recipe.id },
          true,
        ),
        recipe.id,
      );
      const inventory = { ...supplied.inventory };
      const built = buildRecipe(supplied, recipe.id);
      expect(playerProgress(built).xp).toBe(recipeXp(recipe));
      for (const version of [1, 2, 3, 4])
        expect(() =>
          parseSaveResult({ ...built, version, production: undefined }),
        ).toThrow("construction inconnue");
      const restored = importSave(JSON.stringify(built));
      expect(restored).toEqual(built);
      const dismantled = dismantle(restored, restored.constructions[0].id);
      expect(dismantled.inventory).toEqual(inventory);
      expect(dismantled.discovered).toEqual(supplied.discovered);
      expect(dismantled.goalRecipeId).toBe(recipe.id);
      expect(dismantled.coins).toBe(supplied.coins);
      expect(dismantled.boxes).toEqual(supplied.boxes);
      expect(playerProgress(dismantled).xp).toBe(0);
    });
  }
});
