import { commandFixture, runCommandFixture } from "../game/commandTestUtils";
import { Children, createElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RECIPES, pieceCount } from "../game/catalog";
import type { Recipe } from "../game/catalog";
import { adminCommand, buildRecipe, createGame } from "../game/engine";
import { getProduction } from "../game/production";
import type { Game } from "./types";
import { Workshop } from "./Workshop";
import { WorkshopPagination } from "./WorkshopPagination";
import { ConstructionArt } from "../components/BrigoArt";
import {
  INITIAL_WORKSHOP_LIBRARY,
  WORKSHOP_PAGE_SIZE,
  filterWorkshopPlans,
  paginateWorkshop,
  recipeFormat,
  withAvailableWorkshopGoal,
  workshopLibraryReducer,
  workshopPageNumbers,
} from "./workshopLibrary";

vi.mock("../components/BrigoArt", () => ({
  ConstructionArt: vi.fn(() => null),
}));

function recipe(
  id: string,
  total: number,
  overrides: Partial<Recipe> = {},
): Recipe {
  return {
    ...RECIPES[0],
    id,
    name: id,
    description: "Une construction à découvrir.",
    difficulty: "Expert",
    theme: "architecture",
    requirements: [{ modelId: "brick-2x2", quantity: total, label: "Brique" }],
    ...overrides,
  };
}
const entry = (value: Recipe, available = 0) => ({
  recipe: value,
  progress: {
    total: pieceCount(value),
    available,
    canBuild: available === pieceCount(value),
  },
});

describe("bibliothèque : formats indépendants de la difficulté", () => {
  it.each([
    [49, "small"],
    [50, "intermediate"],
    [899, "intermediate"],
    [900, "legendary"],
    [3545, "legendary"],
  ])("classe %i Brigos dans le format %s", (total, expected) => {
    expect(recipeFormat(recipe("plan", total))).toBe(expected);
  });
  it("conserve le format légendaire d’un plan déclaré légendaire", () => {
    expect(
      recipeFormat(recipe("mythe", 800, { difficulty: "Légendaire" })),
    ).toBe("legendary");
  });
  it("combine taille, difficulté, thème et recherche sans modifier les entrées", () => {
    const items = [
      entry(recipe("Écluse du canal", 250)),
      entry(recipe("écluse miniature", 20)),
      entry(recipe("écluse fleurie", 250, { theme: "nature" })),
      entry(recipe("écluse créative", 250, { difficulty: "Créatif" })),
    ];
    const original = [...items];
    expect(
      filterWorkshopPlans(
        items,
        {
          ...INITIAL_WORKSHOP_LIBRARY,
          query: "  ECLUSE ",
          format: "intermediate",
          difficulty: "expert",
          theme: "architecture",
        },
        null,
      ).map((item) => item.recipe.id),
    ).toEqual(["Écluse du canal"]);
    expect(items).toEqual(original);
  });
  it("applique le format aux prêts à construire et à l’objectif suivi", () => {
    const items = [
      entry(recipe("petit", 20), 20),
      entry(recipe("moyen", 80), 80),
      entry(recipe("incomplet", 80), 79),
    ];
    const filters = {
      ...INITIAL_WORKSHOP_LIBRARY,
      format: "intermediate" as const,
      difficulty: "ready",
    };
    expect(
      filterWorkshopPlans(items, filters, null).map((item) => item.recipe.id),
    ).toEqual(["moyen"]);
    expect(
      filterWorkshopPlans(
        items,
        { ...filters, difficulty: "tracked" },
        "incomplet",
      ).map((item) => item.recipe.id),
    ).toEqual(["incomplet"]);
  });
  it("trie toute la sélection avant la découpe en pages", () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      entry(recipe(`plan-${index}`, 79 - index)),
    );
    const sorted = filterWorkshopPlans(
      items,
      { ...INITIAL_WORKSHOP_LIBRARY, sort: "pieces" },
      null,
    );
    expect(
      paginateWorkshop(sorted, 2).items.map((item) => item.progress.total),
    ).toEqual(Array.from({ length: 12 }, (_, index) => 62 + index));
    expect(items[0].progress.total).toBe(79);
  });

  it.each([
    ["special-wheel", "  ROUE ORBITALE  "],
    ["special-axle", "essieu traverse"],
    ["special-bearing", "palier losange"],
    ["special-hinge", "ARTICULATION ECLAT"],
    ["special-hinge", "éclat"],
  ])(
    "retrouve un plan par le modèle %s avec la recherche %s",
    (modelId, query) => {
      const target = recipe("Les horizons", 20, {
        description: "Un projet de navigation.",
        requirements: [{ modelId, quantity: 20, label: "Matériau" }],
      });
      const items = [entry(recipe("Autre projet", 20)), entry(target)];
      expect(
        filterWorkshopPlans(
          items,
          { ...INITIAL_WORKSHOP_LIBRARY, query },
          null,
        ).map((item) => item.recipe.id),
      ).toEqual([target.id]);
    },
  );

  it.each(["navigatrice", "papiers plies"])(
    "conserve la recherche par nom et description : %s",
    (query) => {
      const target = recipe("La navigatrice", 20, {
        description: "Un bureau et des papiers pliés.",
      });
      expect(
        filterWorkshopPlans(
          [entry(recipe("Autre projet", 20)), entry(target)],
          { ...INITIAL_WORKSHOP_LIBRARY, query },
          null,
        ).map((item) => item.recipe.id),
      ).toEqual([target.id]);
    },
  );

  it("combine le nom du Brigo avec les filtres, le stock et l’objectif suivi", () => {
    const hinged = (
      id: string,
      total: number,
      overrides: Partial<Recipe> = {},
    ) =>
      recipe(id, total, {
        theme: "objects",
        requirements: [
          { modelId: "special-hinge", quantity: total, label: "Matériau" },
        ],
        ...overrides,
      });
    const items = [
      entry(hinged("choisi", 20), 20),
      entry(hinged("trop-grand", 80)),
      entry(hinged("autre-theme", 20, { theme: "nature" })),
      entry(hinged("autre-difficulte", 20, { difficulty: "Créatif" })),
      entry(recipe("autre-brigo", 20, { theme: "objects" }), 20),
    ];
    const filters = {
      ...INITIAL_WORKSHOP_LIBRARY,
      query: "articulation eclat",
      theme: "objects",
      format: "small" as const,
      difficulty: "expert",
    };
    expect(
      filterWorkshopPlans(items, filters, null).map((item) => item.recipe.id),
    ).toEqual(["choisi"]);
    expect(
      filterWorkshopPlans(items, { ...filters, difficulty: "ready" }, null).map(
        (item) => item.recipe.id,
      ),
    ).toEqual(["choisi"]);
    expect(
      filterWorkshopPlans(
        items,
        { ...filters, difficulty: "tracked", format: "intermediate" },
        "trop-grand",
      ).map((item) => item.recipe.id),
    ).toEqual(["trop-grand"]);
  });
});

describe("pagination de la bibliothèque et de la galerie", () => {
  const items = Array.from({ length: 65 }, (_, index) => index + 1);
  it("affiche 12 entrées par page et uniquement 5 sur la dernière page de 65 plans", () => {
    expect(WORKSHOP_PAGE_SIZE).toBe(12);
    expect(paginateWorkshop(items, 1)).toMatchObject({
      page: 1,
      pages: 6,
      start: 1,
      end: 12,
      total: 65,
      items: items.slice(0, 12),
    });
    expect(paginateWorkshop(items, 6)).toMatchObject({
      page: 6,
      start: 61,
      end: 65,
      items: [61, 62, 63, 64, 65],
    });
  });
  it("ne laisse jamais de page vide après un filtrage ou une réduction de stock", () => {
    const filtered = items.slice(0, 13);
    const clamped = paginateWorkshop(filtered, 6);
    expect(clamped).toMatchObject({
      page: 2,
      pages: 2,
      start: 13,
      end: 13,
      items: [13],
    });
    const state = workshopLibraryReducer(
      { ...INITIAL_WORKSHOP_LIBRARY, page: 6 },
      { type: "page", page: clamped.page },
    );
    expect(paginateWorkshop(items, state.page).page).toBe(2);
    expect(paginateWorkshop([], 6)).toMatchObject({
      page: 1,
      pages: 1,
      start: 0,
      end: 0,
      items: [],
    });
  });
  it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])(
    "ramène une page invalide %s au début",
    (page) => {
      expect(paginateWorkshop(items, page).page).toBe(1);
    },
  );
  it.each([
    { query: "train" },
    { theme: "vehicles" },
    { difficulty: "ready" },
    { format: "intermediate" as const },
    { sort: "xp" },
  ])(
    "revient à la première page quand un filtre ou un tri change : %o",
    (changes) => {
      expect(
        workshopLibraryReducer(
          { ...INITIAL_WORKSHOP_LIBRARY, page: 5 },
          { type: "filters", changes },
        ),
      ).toMatchObject({ ...changes, page: 1 });
    },
  );
  it("réinitialise les filtres et la page en conservant le tri choisi", () => {
    expect(
      workshopLibraryReducer(
        {
          ...INITIAL_WORKSHOP_LIBRARY,
          page: 6,
          query: "fleur",
          format: "legendary",
          sort: "pieces",
        },
        { type: "clear" },
      ),
    ).toEqual({ ...INITIAL_WORKSHOP_LIBRARY, sort: "pieces" });
  });
  it("retire un filtre d’objectif devenu indisponible sans effacer les autres critères", () => {
    const state = {
      ...INITIAL_WORKSHOP_LIBRARY,
      difficulty: "tracked",
      page: 3,
      theme: "nature",
      query: "arbre",
    };
    expect(withAvailableWorkshopGoal(state, null)).toEqual({
      ...state,
      difficulty: "all",
      page: 1,
    });
    expect(withAvailableWorkshopGoal(state, "sapin")).toBe(state);
    const otherFilter = { ...state, difficulty: "ready" };
    expect(withAvailableWorkshopGoal(otherFilter, null)).toBe(otherFilter);
  });
  it("limite les numéros visibles dans une très grande bibliothèque", () => {
    expect(workshopPageNumbers(1, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(workshopPageNumbers(50, 100)).toEqual([
      1,
      "gap",
      49,
      50,
      51,
      "gap",
      100,
    ]);
    expect(workshopPageNumbers(100, 100)).toEqual([1, "gap", 99, 100]);
  });
  it("le paginateur générique préserve les entrées reçues ; le regroupement des copies appartient à la galerie", () => {
    const constructions = Array.from({ length: 25 }, (_, index) => ({
      id: `build-${index}`,
      recipeId: "totem",
    }));
    expect(paginateWorkshop(constructions, 3).items).toEqual([
      constructions[24],
    ]);
    expect(constructions).toHaveLength(25);
  });
});

describe("sémantique de la bibliothèque", () => {
  it.each(["plans", "créations"] as const)(
    "annonce aussi une sélection vide : %s",
    (kind) => {
      const html = renderToStaticMarkup(
        createElement(WorkshopPagination, {
          ...paginateWorkshop([], 1),
          kind,
          position: "top",
          onPage: vi.fn(),
        }),
      );
      expect(html).toContain('aria-live="polite" aria-atomic="true"');
      expect(html).toContain(
        kind === "plans" ? "Aucun plan" : "Aucune création",
      );
      expect(html).not.toMatch(/0–0|<nav|NaN|Infinity/);
    },
  );
  it.each(["plans", "créations"] as const)(
    "accorde le compteur d’un résultat unique : %s",
    (kind) => {
      const html = renderToStaticMarkup(
        createElement(WorkshopPagination, {
          ...paginateWorkshop([1], 1),
          kind,
          position: "top",
          onPage: vi.fn(),
        }),
      );
      expect(html).toContain(
        `sur <strong>1</strong> ${kind === "plans" ? "plan" : "création"}</p>`,
      );
      expect(html).not.toContain("<nav");
    },
  );
  it("rend seulement une page de cartes et expose les filtres distincts", () => {
    vi.mocked(ConstructionArt).mockClear();
    const game: Game = {
      state: createGame(),
      ready: true,
      busy: false,
      persistent: true,
      notice: null,
      notify: vi.fn(),
      act: vi.fn(async () => commandFixture(createGame())),
    };
    const html = renderToStaticMarkup(
      createElement(Workshop, { game, onRecipe: vi.fn() }),
    );
    expect(html.match(/<article class="recipe-card /g)).toHaveLength(12);
    expect(html).toContain('aria-label="Format des constructions"');
    expect(html).toContain('aria-label="Filtrer les constructions"');
    expect(html).toContain('aria-label="Rechercher une construction"');
    expect(html).toContain('placeholder="Nom de plan ou de Brigo…"');
    expect(html).toContain('aria-label="Pagination des plans (haut)"');
    expect(html).toContain('aria-label="Pagination des plans (bas)"');
    expect(html).toContain("Intermédiaires · 50 à 899");
    expect(html).toContain("Légendaires · 900 et plus");
    expect(html).toContain('<details class="workshop-advanced-filters">');
    expect(html).toContain(`sur <strong>${RECIPES.length}</strong> plans`);
    expect(vi.mocked(ConstructionArt).mock.calls.length).toBeGreaterThan(0);
    expect(
      vi
        .mocked(ConstructionArt)
        .mock.calls.every(
          ([props]) => props.quality === "preview" && props.step === undefined,
        ),
    ).toBe(true);
  });
  it("nomme la page courante et désactive la navigation hors limites", () => {
    const html = renderToStaticMarkup(
      createElement(WorkshopPagination, {
        ...paginateWorkshop([1, 2, 3], 1),
        kind: "plans",
        position: "top",
        onPage: vi.fn(),
        pages: 3,
      }),
    );
    expect(html).toContain('aria-label="Page 1" aria-current="page"');
    expect(html).toMatch(/aria-label="Page précédente" disabled/);
    expect(html).not.toMatch(/aria-label="Page suivante" disabled/);
    const last = renderToStaticMarkup(
      createElement(WorkshopPagination, {
        ...paginateWorkshop(Array.from({ length: 25 }), 3),
        kind: "créations",
        position: "bottom",
        onPage: vi.fn(),
      }),
    );
    expect(last).toContain('aria-label="Pagination des créations (bas)"');
    expect(last).toMatch(/aria-label="Page suivante" disabled/);
    expect(last).toContain("25–25");
  });
});

function workshopGame(
  state = createGame(),
  overrides: Partial<Game> = {},
): Game {
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

function workshopTree(props: Parameters<typeof Workshop>[0]) {
  let tree: ReactNode = null;
  function InspectWorkshop() {
    tree = Workshop(props);
    return tree;
  }
  renderToStaticMarkup(createElement(InspectWorkshop));
  return tree;
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
}

describe("accès direct aux parcours de l’atelier", () => {
  it("ouvre directement les plans réalisables et explique le manque de stock sans proposer un assemblage impossible", () => {
    const game = workshopGame();
    const html = renderToStaticMarkup(
      createElement(Workshop, {
        game,
        onRecipe: vi.fn(),
        initialFilter: "ready",
      }),
    );
    expect(html).toContain("Les plans prêts à construire");
    expect(html).toContain("Votre prochain projet se prépare.");
    expect(html).toContain("Afficher tous les plans");
    expect(html).not.toContain('<article class="recipe-card ');
    expect(game.act).not.toHaveBeenCalled();
  });

  it("fait suivre le choix d’un plan à la fiche, sans consommer de pièces avant assemblage", () => {
    const game = workshopGame();
    const onRecipe = vi.fn();
    const tree = workshopTree({ game, onRecipe });
    const button = findElement(
      tree,
      (element) =>
        element.type === "button" &&
        String(element.props["aria-label"]).startsWith("Voir le plan "),
    )!;
    (button.props.onClick as () => void)();
    expect(onRecipe).toHaveBeenCalledExactlyOnceWith(expect.any(String));
    expect(
      RECIPES.some((recipe) => recipe.id === onRecipe.mock.calls[0][0]),
    ).toBe(true);
    expect(game.act).not.toHaveBeenCalled();
  });

  it("ouvre Mes créations et récolte toutes les piles par la même action atomique, sans double crédit", async () => {
    const now = Date.now();
    let state = createGame();
    for (let index = 0; index < 2; index++) {
      state = buildRecipe(
        adminCommand(state, { type: "recipe", recipeId: "totem" }, true),
        "totem",
        now - 3_600_000,
      );
    }
    const game = workshopGame(state);
    game.act = vi.fn(async (update: Parameters<Game["act"]>[0]) => {
      const response = runCommandFixture(game.state, update);
      game.state = response.state;
      return response;
    });
    const ready = getProduction(state, now).totalReady;
    expect(ready).toBeGreaterThan(0);
    const tree = workshopTree({
      game,
      onRecipe: vi.fn(),
      initialView: "built",
    });
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Tout récolter");
    expect(html).toContain("2 exemplaires");
    expect(html).not.toContain('aria-label="Rechercher une construction"');
    const harvest = findElement(
      tree,
      (element) =>
        element.type === "button" &&
        element.props.className === "button button-primary",
    )!;
    expect(harvest.props.disabled).toBe(false);
    const click = harvest.props.onClick as () => void;
    await click();
    await click();
    expect(game.act).toHaveBeenCalledOnce();
    expect(game.state.coins).toBe(state.coins + ready);
    expect(game.state.inventory).toBe(state.inventory);
    expect(game.state.constructions).toBe(state.constructions);
  });

  it("conserve le démontage du dernier exemplaire et bloque les actions pendant l’enregistrement", () => {
    let state = createGame();
    for (let index = 0; index < 2; index++) {
      state = buildRecipe(
        adminCommand(state, { type: "recipe", recipeId: "totem" }, true),
        "totem",
        Date.now(),
      );
    }
    const game = workshopGame(state);
    const tree = workshopTree({
      game,
      onRecipe: vi.fn(),
      initialView: "built",
    });
    const dismantle = findElement(
      tree,
      (element) => element.props.className === "workshop-dismantle-button",
    )!;
    (dismantle.props.onClick as () => void)();
    const update = vi.mocked(game.act).mock.calls[0][0];
    const next = runCommandFixture(state, update).state;
    expect(next.constructions.map((item) => item.id)).toEqual([
      state.constructions[0].id,
    ]);
    const busyTree = workshopTree({
      game: workshopGame(state, { busy: true }),
      onRecipe: vi.fn(),
      initialView: "built",
    });
    expect(
      findElement(
        busyTree,
        (element) => element.props.className === "workshop-dismantle-button",
      )?.props.disabled,
    ).toBe(true);
  });
});
