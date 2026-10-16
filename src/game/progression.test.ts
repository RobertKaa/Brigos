import { describe, expect, it } from "vitest";
import { RECIPES, RECIPE_BY_ID, pieceCount } from "./catalog";
import type { Recipe } from "./catalog";
import {
  MAX_VALUE,
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
} from "./engine";
import type { GameState } from "./engine";
import { importSave } from "./save";
import {
  ACHIEVEMENT_IDS,
  VISIT_REWARD_INTERVAL_MS,
  claimAchievement,
  claimVisitReward,
  getChallenges,
  playerProgress,
  recipeXp,
  visitRewardStatus,
} from "./progression";

function supplyAndBuild(state: GameState, recipeId: string): GameState {
  return buildRecipe(
    adminCommand(state, { type: "recipe", recipeId }, true),
    recipeId,
  );
}

describe("progression de l’exposition", () => {
  it("commence au niveau 1 sans expérience et sans récompense d’XP stockée", () => {
    expect(playerProgress(createGame())).toMatchObject({
      xp: 0,
      level: 1,
      rank: "Nouveau bâtisseur",
      currentLevelXp: 0,
      nextLevelXp: 100,
      remainingXp: 100,
      progress: 0,
      contributions: [],
    });
  });

  it.each([
    ["Premiers pas", 46],
    ["Créatif", 106],
    ["Expert", 216],
    ["Légendaire", 1016],
  ] as const)(
    "calcule l’XP selon la difficulté %s et le nombre de pièces",
    (difficulty, xp) => {
      const recipe: Recipe = {
        ...RECIPES[0],
        difficulty,
        requirements: [
          { label: "Huit briques", modelId: "brick-2x2", quantity: 8 },
        ],
      };
      expect(recipeXp(recipe)).toBe(xp);
    },
  );

  it("compte seulement les constructions exposées, et regroupe les copies", () => {
    const first = supplyAndBuild(createGame(), "totem");
    const two = supplyAndBuild(first, "totem");
    const recipe = RECIPE_BY_ID.get("totem")!;
    expect(playerProgress(two)).toMatchObject({
      xp: recipeXp(recipe) * 2,
      contributions: [
        {
          recipeId: recipe.id,
          count: 2,
          xpEach: recipeXp(recipe),
          xp: recipeXp(recipe) * 2,
        },
      ],
    });
    expect(playerProgress({ ...two, constructions: [] }).xp).toBe(0);
    const withoutHistory = { ...two, history: [] };
    expect(playerProgress(withoutHistory).xp).toBe(playerProgress(two).xp);
  });

  it("fait descendre le niveau au démontage et empêche le farm par remontage", () => {
    let state = createGame();
    for (let cycle = 0; cycle < 5; cycle++) {
      state = supplyAndBuild(state, "totem");
      const builtXp = playerProgress(state).xp;
      expect(builtXp).toBe(recipeXp(RECIPE_BY_ID.get("totem")!));
      state = dismantle(state, state.constructions[0].id);
      expect(playerProgress(state)).toMatchObject({ xp: 0, level: 1 });
    }
    for (let copy = 0; copy < 3; copy++) state = supplyAndBuild(state, "totem");
    expect(playerProgress(state).level).toBe(2);
    state = dismantle(state, state.constructions[0].id);
    expect(playerProgress(state).level).toBe(1);
  });

  it("fournit des seuils et une fraction de barre cohérents au changement de niveau", () => {
    let state = createGame();
    for (let copy = 0; copy < 3; copy++) state = supplyAndBuild(state, "totem");
    const progress = playerProgress(state);
    expect(progress).toMatchObject({
      level: 2,
      xp: 120,
      currentLevelXp: 100,
      nextLevelXp: 300,
      remainingXp: 180,
    });
    expect(progress.progress).toBeCloseTo(0.1);
    expect(progress.xp).toBe(
      progress.contributions.reduce((sum, item) => sum + item.xp, 0),
    );
  });

  it.each(RECIPES.map((recipe) => [recipe.id, recipe] as const))(
    "%s gagne exactement son XP et la perd entièrement au démontage",
    (id, recipe) => {
      const original = createGame();
      const built = supplyAndBuild(original, id);
      expect(playerProgress(built).xp).toBe(recipeXp(recipe));
      const removed = dismantle(built, built.constructions[0].id);
      expect(playerProgress(removed)).toMatchObject({ xp: 0, level: 1 });
      expect(removed.coins).toBe(original.coins);
      expect(removed.boxes).toEqual(original.boxes);
    },
  );
});

describe("contrats de construction", () => {
  it("possède trois identifiants uniques et ne récompense pas un contrat incomplet", () => {
    const state = createGame();
    expect(new Set(ACHIEVEMENT_IDS).size).toBe(3);
    expect(
      getChallenges(state).every((item) => !item.completed && !item.claimed),
    ).toBe(true);
    expect(() => claimAchievement(state, "builder-variety")).toThrow(
      "Terminez",
    );
    expect(() => claimAchievement(state, "unknown")).toThrow("n’existe pas");
  });

  it("exige des plans différents présents simultanément", () => {
    let state = supplyAndBuild(createGame(), "totem");
    state = supplyAndBuild(state, "totem");
    state = supplyAndBuild(state, "bench");
    expect(getChallenges(state)[0]).toMatchObject({
      current: 2,
      completed: false,
    });
    state = supplyAndBuild(state, "tree");
    expect(getChallenges(state)[0]).toMatchObject({
      current: 3,
      completed: true,
      canClaim: true,
    });
    const tree = state.constructions.find((item) => item.recipeId === "tree")!;
    state = dismantle(state, tree.id);
    expect(getChallenges(state)[0]).toMatchObject({
      current: 2,
      completed: false,
    });
  });

  it("crédite la récompense une seule fois, même après démontage et reconstruction", () => {
    let state = createGame();
    for (const id of ["totem", "bench", "tree"])
      state = supplyAndBuild(state, id);
    const previousXp = playerProgress(state).xp;
    const claimed = claimAchievement(state, "builder-variety");
    expect(claimed.coins).toBe(state.coins + 150);
    expect(claimed.claimedAchievements).toEqual(["builder-variety"]);
    expect(playerProgress(claimed).xp).toBe(previousXp);
    expect(state.claimedAchievements).toEqual([]);
    expect(() => claimAchievement(claimed, "builder-variety")).toThrow("déjà");
    const removed = dismantle(claimed, claimed.constructions[0].id);
    expect(getChallenges(removed)[0]).toMatchObject({
      claimed: true,
      completed: false,
      canClaim: false,
    });
    const rebuilt = supplyAndBuild(removed, "totem");
    expect(playerProgress(rebuilt).xp).toBe(previousXp);
    expect(() => claimAchievement(rebuilt, "builder-variety")).toThrow("déjà");
  });

  it("récompense une construction Expert avec une boîte Atelier", () => {
    const expert = RECIPES.find((recipe) => recipe.difficulty === "Expert")!;
    const state = supplyAndBuild(createGame(), expert.id);
    const claimed = claimAchievement(state, "first-expert");
    expect(claimed.boxes.workshop).toBe(state.boxes.workshop + 1);
    expect(claimed.coins).toBe(state.coins);
  });

  it("accepte aussi une construction Légendaire pour le contrat Maître d’œuvre", () => {
    const legendary = RECIPES.find(
      (recipe) => recipe.difficulty === "Légendaire",
    )!;
    expect(legendary).toBeDefined();
    const built = supplyAndBuild(createGame(), legendary.id);
    expect(
      getChallenges(built).find((item) => item.id === "first-expert"),
    ).toMatchObject({
      current: 1,
      completed: true,
      canClaim: true,
    });
    const removedBeforeClaim = dismantle(built, built.constructions[0].id);
    expect(() => claimAchievement(removedBeforeClaim, "first-expert")).toThrow(
      "Terminez",
    );

    const claimed = claimAchievement(built, "first-expert");
    expect(claimed.boxes.workshop).toBe(built.boxes.workshop + 1);
    expect(playerProgress(claimed).xp).toBe(playerProgress(built).xp);
    const removedAfterClaim = dismantle(claimed, claimed.constructions[0].id);
    expect(
      getChallenges(removedAfterClaim).find(
        (item) => item.id === "first-expert",
      ),
    ).toMatchObject({
      current: 0,
      completed: false,
      claimed: true,
      canClaim: false,
    });
    expect(() => claimAchievement(removedAfterClaim, "first-expert")).toThrow(
      "déjà",
    );
  });

  it("compte les pièces réellement réservées aux modèles présents", () => {
    const recipe = RECIPES.reduce((largest, candidate) =>
      pieceCount(candidate) > pieceCount(largest) ? candidate : largest,
    );
    let state = createGame();
    let expected = 0;
    while (expected < 100) {
      state = supplyAndBuild(state, recipe.id);
      expected += pieceCount(recipe);
    }
    expect(
      getChallenges(state).find((item) => item.id === "grand-exhibition"),
    ).toMatchObject({ current: expected, completed: true });
    expect(claimAchievement(state, "grand-exhibition").boxes.prism).toBe(1);
  });

  it("conserve le droit de réclamer si la réserve monétaire déborde", () => {
    let state = { ...createGame(), coins: MAX_VALUE - 149 };
    for (const id of ["totem", "bench", "tree"])
      state = supplyAndBuild(state, id);
    const snapshot = structuredClone(state);
    expect(() => claimAchievement(state, "builder-variety")).toThrow("réserve");
    expect(state).toEqual(snapshot);
  });

  it("conserve les récompenses reçues et le délai de retour après export et réimport", () => {
    const expert = RECIPES.find((recipe) => recipe.difficulty === "Expert")!;
    const built = supplyAndBuild(createGame(), expert.id);
    const now = Date.parse("2026-10-09T10:00:00.000Z");
    const claimed = claimVisitReward(
      claimAchievement(built, "first-expert"),
      now,
    );
    const restored = importSave(JSON.stringify(claimed));
    expect(playerProgress(restored)).toEqual(playerProgress(claimed));
    expect(restored.boxes).toEqual(claimed.boxes);
    expect(restored.coins).toBe(claimed.coins);
    expect(() => claimAchievement(restored, "first-expert")).toThrow("déjà");
    expect(() => claimVisitReward(restored, now + 1)).toThrow("minuit UTC");
  });
});

describe("rendez-vous d’atelier", () => {
  const now = Date.parse("2026-10-09T10:00:00.000Z");

  it("offre un premier cadeau immédiat puis le renouvelle à minuit UTC", () => {
    const initial = createGame();
    expect(visitRewardStatus(initial, now)).toMatchObject({
      available: true,
      nextAvailableAt: null,
      remainingMs: 0,
    });
    const claimed = claimVisitReward(initial, now);
    expect(claimed.coins).toBe(initial.coins + 100);
    expect(claimed.boxes.discovery).toBe(initial.boxes.discovery + 1);
    expect(claimed.lastVisitRewardAt).toBe(new Date(now).toISOString());
    expect(initial.lastVisitRewardAt).toBeNull();
    const midnight = Date.parse("2026-10-10T00:00:00.000Z");
    expect(visitRewardStatus(claimed, midnight - 1)).toMatchObject({
      available: false,
      remainingMs: 1,
    });
    expect(() => claimVisitReward(claimed, now)).toThrow("minuit UTC");
    expect(visitRewardStatus(claimed, midnight).available).toBe(true);
    const second = claimVisitReward(claimed, midnight);
    expect(second.coins).toBe(initial.coins + 200);
  });

  it("ne pénalise pas les jours manqués et ne cumule pas les cadeaux absents", () => {
    const first = claimVisitReward(createGame(), now);
    const later = claimVisitReward(first, now + VISIT_REWARD_INTERVAL_MS * 10);
    expect(later.coins).toBe(first.coins + 100);
    expect(later.boxes.discovery).toBe(first.boxes.discovery + 1);
    expect(
      visitRewardStatus(later, now + VISIT_REWARD_INTERVAL_MS * 10).available,
    ).toBe(false);
    expect(playerProgress(later).xp).toBe(0);
  });

  it("ne réinitialise pas le délai quand l’horloge recule", () => {
    const first = claimVisitReward(createGame(), now);
    expect(visitRewardStatus(first, now - 1000)).toMatchObject({
      available: false,
      clockAdjusted: true,
    });
    expect(() => claimVisitReward(first, now - 1000)).toThrow("horloge");
    expect(first.lastVisitRewardAt).toBe(new Date(now).toISOString());
  });

  it.each([NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER])(
    "refuse une horloge invalide (%s)",
    (invalidNow) => {
      expect(() => claimVisitReward(createGame(), invalidNow)).toThrow("heure");
    },
  );

  it("refuse une date sauvegardée invalide", () => {
    expect(() =>
      visitRewardStatus({ lastVisitRewardAt: "bad-date" }, now),
    ).toThrow("date");
  });

  it("refuse atomiquement les débordements sans consommer le cadeau", () => {
    for (const state of [
      { ...createGame(), coins: MAX_VALUE - 99 },
      {
        ...createGame(),
        boxes: { discovery: MAX_VALUE, workshop: 0, prism: 0 },
      },
    ]) {
      const snapshot = structuredClone(state);
      expect(() => claimVisitReward(state, now)).toThrow("réserve");
      expect(state).toEqual(snapshot);
      expect(visitRewardStatus(state, now).available).toBe(true);
    }
    const exact = claimVisitReward(
      { ...createGame(), coins: MAX_VALUE - 100 },
      now,
    );
    expect(exact.coins).toBe(MAX_VALUE);
  });
});
