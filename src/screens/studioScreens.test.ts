import { commandFixture } from "../game/commandTestUtils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Collection } from "./Collection";
import { Workshop } from "./Workshop";
import { PlayerProgress } from "../components/PlayerProgress";
import { createGame } from "../game/engine";
import { RECIPES, pieceCount } from "../game/catalog";
import type { GameState } from "../game/engine";
import type { Game } from "./types";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";

// Geometry has its own coverage. These integration checks inspect screen semantics.
vi.mock("../components/BrigoArt", () => ({
  BrigoArt: () => null,
  ConstructionArt: () => null,
}));

function game(state: GameState): Game {
  return {
    state,
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    notify: vi.fn(),
    act: vi.fn(async () => commandFixture(createGame())),
  };
}

describe("écrans du studio", () => {
  it("ouvre la collection sur les exemplaires possédés et garde les chiffres secondaires repliés", () => {
    const state = {
      ...createGame(),
      inventory: { "brick-1x1:blue": 2 },
      discovered: ["brick-1x1:blue"],
    };
    const html = renderToStaticMarkup(
      createElement(Collection, { game: game(state), onBrigo: vi.fn() }),
    );
    expect(html).toContain("Brique 1 × 1 · Océan, Commun, 2 exemplaires");
    expect(html).not.toContain("Brique 1 × 1 · Corail, Commun, 0 exemplaire");
    expect(html).toContain('<details class="collection-overview">');
    expect(html).toContain('aria-pressed="true" class="active">Mes Brigos');
    expect(html).not.toContain("Réinitialiser les filtres");
  });
  it("guide une collection vide vers les boîtes, avec l’album complet toujours accessible", () => {
    const html = renderToStaticMarkup(
      createElement(Collection, { game: game(createGame()), onBrigo: vi.fn() }),
    );
    expect(html).toContain("Vos premiers Brigos vous attendent.");
    expect(html).toContain('href="#boxes">Ouvrir une boîte');
    expect(html).toContain("Tout l’album");
  });
  it("garde les Brigos du bac à sable dans les exemplaires possédés de l’album", () => {
    const id = "brick-1x1:blue";
    let state: GameState = {
      ...createGame(),
      inventory: { [id]: 1 },
      discovered: [id],
    };
    state = createSandboxProject(state, "Mon idée");
    state = placeSandboxBrigo(state, state.sandboxProjects![0].id, {
      brigoId: id,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
    });
    const html = renderToStaticMarkup(
      createElement(Collection, { game: game(state), onBrigo: vi.fn() }),
    );
    expect(html).toContain("Brique 1 × 1 · Océan, Commun, 1 exemplaire");
    expect(html).toContain('class="reserved-count">1');
    const atelier = renderToStaticMarkup(
      createElement(Workshop, { game: game(state), onRecipe: vi.fn() }),
    );
    expect(atelier).toContain('href="#sandbox"');
    expect(atelier).toContain("Construire librement");
  });
  it("affiche un album vide sans pourcentage invalide et avec des filtres nommés", () => {
    const html = renderToStaticMarkup(
      createElement(Collection, { game: game(createGame()), onBrigo: vi.fn() }),
    );
    expect(html).toContain('aria-label="Album complété"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-label="Trier les Brigos"');
    expect(html).toContain('aria-label="Couleur Feuille"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it("signale un objectif déjà assemblé comme accompli même si sa réserve libre est vide", () => {
    const recipe = RECIPES[0];
    const state = createGame();
    state.goalRecipeId = recipe.id;
    state.constructions = [
      {
        id: "built",
        recipeId: recipe.id,
        createdAt: "2026-10-09T10:00:00.000Z",
        pieces: { "brick-2x2:blue": 5 },
      },
    ];
    const html = renderToStaticMarkup(
      createElement(Workshop, { game: game(state), onRecipe: vi.fn() }),
    );
    expect(html).toContain('aria-label="Votre objectif suivi"');
    expect(html).toContain("Création exposée : objectif accompli.");
    expect(html).toContain("Revoir le plan");
    expect(html).not.toContain(
      "Toutes les pièces sont réunies. À vous de jouer !",
    );
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it("donne une barre accessible et une action explicite aux plans complets", () => {
    const recipe = RECIPES[0];
    const state = createGame();
    state.inventory = recipe.placements.reduce<Record<string, number>>(
      (inventory, part) => {
        const id = `${part.modelId}:${part.colorId ?? "blue"}`;
        inventory[id] = (inventory[id] ?? 0) + 1;
        return inventory;
      },
      {},
    );
    const html = renderToStaticMarkup(
      createElement(Workshop, { game: game(state), onRecipe: vi.fn() }),
    );
    expect(html).toContain("Toutes les pièces réunies");
    expect(html).toContain("Voir et assembler");
    expect(html).toContain(`aria-label="Brigos réunis pour ${recipe.name}"`);
    expect(html).toContain(
      `aria-valuemax="${pieceCount(recipe)}" aria-valuenow="${pieceCount(recipe)}"`,
    );
    expect(html).toContain("Encore 100 XP");
  });
  it("conserve les objectifs de construction et la progression dans le tableau dédié", () => {
    const html = renderToStaticMarkup(
      createElement(PlayerProgress, { game: game(createGame()) }),
    );
    expect(html).toContain("Vos objectifs");
    expect(html).toContain('aria-label="Progression vers le niveau 2"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).not.toContain("Récupérer le cadeau");
  });
});
