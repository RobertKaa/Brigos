import { commandFixture, runCommandFixture } from "../game/commandTestUtils";
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG, RECIPES } from "../game/catalog";
import type { Recipe } from "../game/catalog";
import { createGame, matchesRequirement, MAX_VALUE } from "../game/engine";
import type { GameState } from "../game/engine";
import {
  getProduction,
  observeProduction,
  productionPerCycle,
  PRODUCTION_RESERVE_MS,
  recipeProductionIntervalMs,
  recipeProductionPerDay,
} from "../game/production";
import type { Game } from "../screens/types";
import {
  harvestAllProductions,
  harvestRecipeProduction,
  ProductionPanel,
} from "./ProductionPanel";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useState: vi.fn(react.useState) };
});

const NOW = Date.parse("2026-10-19T12:00:00.000Z");
const PLAN = RECIPES[0];
const CYCLE = recipeProductionIntervalMs(PLAN);
const YIELD = productionPerCycle(PLAN);
const DAILY = recipeProductionPerDay(PLAN);
const RESERVE_CYCLES = PRODUCTION_RESERVE_MS / CYCLE;
const OTHER = RECIPES.find(
  (recipe) =>
    recipe.id !== PLAN.id && recipeProductionIntervalMs(recipe) === CYCLE,
)!;
const coinLabel = (amount: number) => `${amount} pièce${amount > 1 ? "s" : ""}`;

function built(recipes: Recipe[] = [PLAN], elapsed = CYCLE): GameState {
  const anchor = NOW - elapsed;
  return observeProduction(
    {
      ...createGame(),
      production: undefined,
      constructions: recipes.map((recipe, index) => ({
        id: `construction-${index}`,
        recipeId: recipe.id,
        createdAt: new Date(anchor).toISOString(),
        pieces: Object.fromEntries(
          recipe.requirements.map((requirement) => [
            CATALOG.find((part) => matchesRequirement(part, requirement))!.id,
            requirement.quantity,
          ]),
        ),
      })),
    },
    anchor,
  );
}

function gameFor(state = createGame(), overrides: Partial<Game> = {}): Game {
  return {
    state,
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    notify: vi.fn(),
    act: vi.fn(async () => commandFixture(createGame())),
    ...overrides,
  };
}

function render(game: Game, compact = false) {
  return renderToStaticMarkup(
    createElement(ProductionPanel, { game, compact }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("récoltes des créations", () => {
  it("guide vers un premier plan sans annoncer de récompense avant construction", () => {
    const game = gameFor();
    const html = render(game);
    expect(html).toContain("Votre première création lance l’aventure.");
    expect(html).toContain('href="#workshop"');
    expect(html).toContain("Un petit plan commence à produire après 1 h.");
    expect(html).toContain("grandes créations vont jusqu’à 8 h");
    expect(html).toContain(
      "Les projets libres du bac à sable ne produisent pas.",
    );
    expect(html).not.toContain("production-harvest-button");
    expect(game.act).not.toHaveBeenCalled();
  });

  it("additionne les copies et conserve une seule pile et une seule jauge par plan", () => {
    const state = built([PLAN, PLAN], 2 * CYCLE);
    const html = render(gameFor(state));
    expect(html.match(/class="production-row(?: is-full)?"/g)).toHaveLength(1);
    expect(html).toContain("2 exemplaires");
    expect(html).toContain(`2 × ${coinLabel(YIELD)} / 1 h`);
    expect(html).toContain(`Récolter ${YIELD * 4} pièces`);
    expect(html).toContain(`${DAILY * 2} pièces / jour`);
    expect(html).toContain(
      `max="${YIELD * 2 * RESERVE_CYCLES}" value="${YIELD * 4}"`,
    );
    expect(html).toContain("72 h de réserve");
    expect(html).not.toContain("Brigos à récolter");
    expect(html).not.toContain("production en Brigos");
  });

  it("explique le premier cycle d’une heure et désactive la récolte avant sa fin", () => {
    const html = render(gameFor(built([PLAN], CYCLE / 2)));
    expect(html).toContain("Prochaine récolte dans 30 min");
    expect(html).toMatch(/class="production-harvest-button" disabled=""[^>]*>/);
    expect(html).toContain("En cours de production");
    expect(html).toContain('data-production-ready="0"');
  });

  it("signale la réserve pleine de trois jours sans inventer de prochain cycle", () => {
    const html = render(gameFor(built([PLAN], 10 * PRODUCTION_RESERVE_MS)));
    expect(html).toContain(`Récolter ${YIELD * RESERVE_CYCLES} pièces`);
    expect(html).toContain("Toutes les réserves sont pleines.");
    expect(html).toContain("Réserve pleine · récoltez pour reprendre");
    expect(html).not.toContain("Prochaine récolte dans");
  });

  it("garde la même récolte dans le carnet sans dupliquer la liste complète", () => {
    const game = gameFor(built([PLAN, PLAN]));
    const full = render(game);
    const compact = render(game, true);
    expect(compact).toContain(`Récolter ${YIELD * 2} pièces`);
    expect(compact).toContain("Voir mes créations");
    expect(compact).toContain('href="#workshop"');
    expect(compact).not.toContain("production-list");
    expect(full).toContain("production-list");
  });

  it("replie les plans au-delà des cinq premiers au lieu de montrer une longue liste", () => {
    const html = render(gameFor(built(RECIPES.slice(0, 7))));
    expect(html).toContain('<details class="production-more">');
    expect(html).toContain("Voir 2 autres plans");
    expect(html.match(/class="production-row(?: is-full)?"/g)).toHaveLength(7);
  });

  it.each([{ busy: true }, { ready: false }])(
    "bloque les récoltes pendant une sauvegarde ou un chargement : %j",
    (overrides) => {
      const html = render(gameFor(built(), overrides));
      expect(html).toMatch(
        /class="production-harvest-button" disabled=""[^>]*>/,
      );
      expect(html).toMatch(
        /class="production-row-stack" type="button" disabled=""/,
      );
    },
  );

  it("explique la limite de monnaie et laisse les pièces en réserve", () => {
    const state = { ...built(), coins: MAX_VALUE };
    const html = render(gameFor(state));
    expect(html).toContain("Votre réserve de pièces ne peut pas accueillir");
    expect(html).toContain("Votre récolte reste en réserve.");
    expect(html).toMatch(/class="production-harvest-button" disabled=""[^>]*>/);
    expect(getProduction(state, NOW).totalReady).toBe(YIELD);
  });

  it("conserve la récolte déjà acquise quand l’horloge recule et explique la pause", () => {
    const state = observeProduction(built(), NOW);
    vi.setSystemTime(NOW - CYCLE / 2);
    const html = render(gameFor(state));
    expect(html).toContain("L’horloge a changé.");
    expect(html).toContain("Les pièces déjà produites restent disponibles");
    expect(html).toContain("Production en attente de l’horloge");
    expect(html).toMatch(/class="production-harvest-button" aria-describedby=/);
  });

  it("relit l’heure réelle après une action même si le rafraîchissement de 30 secondes conserve encore l’ancienne heure", () => {
    const tickTime = NOW - 10_000;
    const state = observeProduction(built(), NOW);
    vi.mocked(useState).mockReturnValueOnce([tickTime, vi.fn()]);

    const html = render(gameFor(state));

    expect(html).not.toContain("L’horloge a changé.");
    expect(html).not.toContain("Production en attente de l’horloge");
    expect(html).toContain(`Récolter ${coinLabel(YIELD)}`);
  });

  it("affiche les cadences propres à chaque plan et un intervalle global pour une galerie mixte", () => {
    const large = RECIPES.find(
      (recipe) => recipeProductionIntervalMs(recipe) === 8 * 3_600_000,
    )!;
    const state = built([PLAN, large], CYCLE / 2);
    const html = render(gameFor(state));
    expect(html).toContain("<strong>1–8 H</strong>");
    expect(html).toContain(`${coinLabel(YIELD)} / 1 h`);
    expect(html).toContain(`${coinLabel(productionPerCycle(large))} / 8 h`);
    expect(html).toContain("Prochaine récolte dans 30 min");
    expect(html).toContain("Prochaine récolte dans 7 h 30");
    expect(html).not.toContain("24 H");
  });
});

describe("récolte de monnaie atomique depuis l’interface", () => {
  it("notifie le gain réel après validation et ne touche pas aux Brigos", async () => {
    const state = built([PLAN, PLAN]);
    let committed: GameState | undefined;
    const act = vi.fn<Game["act"]>(async (transform) => {
      const response = runCommandFixture(state, transform);
      committed = response.state;
      return response;
    });
    const game = gameFor(state, { act });
    expect(await harvestAllProductions(game, NOW)).toBe(true);
    expect(committed?.coins).toBe(state.coins + YIELD * 2);
    expect(committed?.inventory).toEqual(state.inventory);
    expect(committed?.constructions).toEqual(state.constructions);
    expect(game.notify).toHaveBeenCalledWith(
      `+${YIELD * 2} pièces récoltées grâce à vos créations.`,
    );
    expect(act.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(game.notify).mock.invocationCallOrder[0],
    );
  });

  it("récolte toutes les copies de la pile sélectionnée en laissant les autres plans intacts", async () => {
    const other = OTHER;
    const state = built([PLAN, PLAN, other]);
    let committed = state;
    const game = gameFor(state, {
      act: vi.fn(async (transform) => {
        const response = runCommandFixture(state, transform);
        committed = response.state;
        return response;
      }),
    });
    await harvestRecipeProduction(game, PLAN.id, NOW);
    expect(committed.coins).toBe(state.coins + 2 * YIELD);
    expect(getProduction(committed, NOW).rows.map((row) => row.ready)).toEqual([
      0,
      0,
      productionPerCycle(other),
    ]);
  });

  it("annonce le montant du snapshot effectivement sauvegardé si la vue était plus ancienne", async () => {
    const displayed = built([PLAN]);
    const current = built([PLAN, PLAN]);
    const game = gameFor(displayed, {
      act: vi.fn(async (transform) => {
        return runCommandFixture(current, transform);
      }),
    });
    await harvestAllProductions(game, NOW);
    expect(game.notify).toHaveBeenCalledWith(
      `+${YIELD * 2} pièces récoltées grâce à vos créations.`,
    );
  });

  it("ne publie aucun succès si la transaction échoue", async () => {
    const state = built();
    const game = gameFor(state, {
      act: vi.fn(async (transform) => {
        runCommandFixture(state, transform);
        return null;
      }),
    });
    expect(await harvestAllProductions(game, NOW)).toBe(false);
    expect(game.notify).not.toHaveBeenCalled();
  });

  it.each([
    { name: "chargement", overrides: { ready: false }, elapsed: CYCLE },
    { name: "sauvegarde", overrides: { busy: true }, elapsed: CYCLE },
    { name: "cycle incomplet", overrides: {}, elapsed: CYCLE / 2 },
  ])(
    "ne déclenche pas de transaction : $name",
    async ({ overrides, elapsed }) => {
      const game = gameFor(built([PLAN], elapsed), overrides);
      expect(await harvestAllProductions(game, NOW)).toBe(false);
      expect(game.act).not.toHaveBeenCalled();
      expect(game.notify).not.toHaveBeenCalled();
    },
  );

  it("permet de récolter une petite pile si le total de toutes les piles dépasserait le plafond", async () => {
    const state = {
      ...built([PLAN, PLAN, OTHER]),
      coins: MAX_VALUE - YIELD * 2,
    };
    const game = gameFor(state, {
      act: vi.fn(async (transform) => {
        expect(runCommandFixture(state, transform).state.coins).toBe(MAX_VALUE);
        return runCommandFixture(state, transform);
      }),
    });
    expect(await harvestAllProductions(game, NOW)).toBe(false);
    expect(game.act).not.toHaveBeenCalled();
    expect(await harvestRecipeProduction(game, PLAN.id, NOW)).toBe(true);
  });
});
