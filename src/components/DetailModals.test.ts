import { commandFixture } from "../game/commandTestUtils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeDetail } from "./DetailModals";
import { ConstructionArt } from "./BrigoArt";
import { RECIPES } from "../game/catalog";
import type { Recipe } from "../game/catalog";
import { adminCommand, createGame, recipeProgress } from "../game/engine";
import type { GameState } from "../game/engine";
import type { Game } from "../screens/types";

// The geometry suite checks drawing fidelity; these checks protect instruction
// controls and inventory colors when the preview is isolated from the sidebar.
const rendering = vi.hoisted(() => ({ instructions: false }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: ((initial: unknown) =>
      actual.useState(
        initial === false ? rendering.instructions : initial,
      )) as typeof actual.useState,
  };
});
vi.mock("./BrigoArt", () => ({
  BrigoArt: () => null,
  ConstructionArt: vi.fn(() => null),
}));

function renderRecipe(recipe: Recipe, state: GameState = createGame()) {
  const game: Game = {
    state,
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    notify: vi.fn(),
    act: vi.fn(async () => commandFixture(createGame())),
  };
  return renderToStaticMarkup(
    createElement(RecipeDetail, {
      recipe,
      game,
      adminEnabled: false,
      admin: vi.fn(async () => true),
      onClose: vi.fn(),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  rendering.instructions = false;
});

describe("instructions des plans", () => {
  it.each(RECIPES.filter((recipe) => recipe.difficulty === "Légendaire"))(
    "$name : conserve les limites, le dernier lot partiel et les commandes accessibles",
    (recipe) => {
      rendering.instructions = true;
      const html = renderRecipe(recipe);
      const count = recipe.placements.length;
      const lots = Math.ceil(count / 150);
      expect(html).toContain(
        `max="${count}" aria-label="Étape de montage" value="${count}"`,
      );
      expect(html).toContain('aria-label="Pièce suivante" disabled=""');
      expect(html).toContain('aria-label="Pièce précédente"');
      expect(html).toContain(
        'aria-label="Tourner la construction de 90 degrés"',
      );
      expect(html).toContain('aria-label="Agrandir la vue"');
      expect(html).toContain('aria-label="Réduire la vue" disabled=""');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain("Voir l’ensemble");
      expect(html.match(/<option /g)).toHaveLength(lots + 1);
      expect(html).toContain(
        `Lot ${lots} · pièces ${(lots - 1) * 150 + 1}–${count}`,
      );
      expect(vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0]).toMatchObject({
        recipeId: recipe.id,
        quality: "preview",
        rotation: 0,
      });
      expect(vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0].step).toBe(
        count,
      );
    },
  );

  it("garde les couleurs réelles allouées au plan libre dans l’aperçu isolé", () => {
    const recipe = RECIPES.find((candidate) =>
      candidate.requirements.every((requirement) => !requirement.colorId),
    )!;
    const state = createGame();
    state.inventory = Object.fromEntries(
      recipe.requirements.map((requirement) => [
        `${requirement.modelId}:blue`,
        requirement.quantity,
      ]),
    );
    expect(recipeProgress(state, recipe).canBuild).toBe(true);
    renderRecipe(recipe, state);
    expect(vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0].pieces).toEqual(
      recipeProgress(state, recipe).pieces,
    );
    expect(
      Object.keys(
        vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0].pieces ?? {},
      ),
    ).toEqual(Object.keys(state.inventory));
  });

  it("actualise le stock affiché et l’allocation après un changement d’inventaire", () => {
    const recipe = RECIPES.find(
      (candidate) => candidate.placements.length > 900,
    )!;
    const missing = renderRecipe(recipe);
    expect(
      vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0].pieces,
    ).toBeUndefined();
    expect(missing).toContain("Brigos à réunir.");
    const supplied = adminCommand(
      createGame(),
      { type: "recipe", recipeId: recipe.id },
      true,
    );
    const complete = renderRecipe(recipe, supplied);
    expect(vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0].pieces).toEqual(
      recipeProgress(supplied, recipe).pieces,
    );
    expect(complete).toContain("Assembler ma création");
    expect(complete).toContain("Toutes les pièces sont là");
  });

  it("conserve une lecture simple sans lots ni zoom pour un petit plan", () => {
    const html = renderRecipe(RECIPES[0]);
    expect(html).not.toContain('aria-label="Étape de montage"');
    expect(html).toContain("Voir les étapes");
    expect(html).not.toContain('aria-label="Lot de montage"');
    expect(html).not.toContain('aria-label="Agrandir la vue"');
  });

  it("présente d’abord l’action et l’ensemble, puis les étapes à la demande", () => {
    const recipe = RECIPES.find((item) => item.placements.length > 900)!;
    const html = renderRecipe(recipe);
    expect(html.indexOf('aria-label="Prochaine étape du plan"')).toBeLessThan(
      html.indexOf('class="recipe-detail-layout"'),
    );
    expect(html).not.toContain('aria-label="Lot de montage"');
    expect(html).not.toContain('aria-label="Étape de montage"');
    expect(
      vi.mocked(ConstructionArt).mock.calls.at(-1)?.[0].step,
    ).toBeUndefined();
    expect(html).toContain('<details class="recipe-parts-details">');
  });

  it("permet d’inspecter les détails d’un plan moyen sans imposer les lots", () => {
    const recipe = RECIPES.find(
      (candidate) =>
        candidate.placements.length > 80 && candidate.placements.length <= 180,
    )!;
    const html = renderRecipe(recipe);
    expect(html).toContain('aria-label="Agrandir la vue"');
    expect(html).not.toContain('aria-label="Lot de montage"');
    expect(html).toContain("Vue d’ensemble");
  });
});
