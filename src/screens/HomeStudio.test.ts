import { commandFixture } from "../game/commandTestUtils";
import { Children, createElement, isValidElement } from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Home, OddsContent } from "./HomeStudio";
import type { Game } from "./types";
import { adminCommand, buildRecipe, createGame } from "../game/engine";
import type { GameState } from "../game/engine";
import { BOXES, BOX_IDS, BOX_DROP_COUNT, RARITIES } from "../game/catalog";
import { BoxArt } from "../components/BrigoArt";

const game = (state: GameState) =>
  ({
    state,
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    notify: () => {},
    act: async () => commandFixture(createGame()),
  }) as Game;
const homeProps = (
  state = createGame(),
  overrides: Partial<ComponentProps<typeof Home>> = {},
): ComponentProps<typeof Home> => ({
  game: game(state),
  selectedBox: "discovery",
  onSelectBox: vi.fn(),
  onOpen: vi.fn(),
  onOdds: vi.fn(),
  onBrigo: vi.fn(),
  onRecipe: vi.fn(),
  ...overrides,
});
const renderHome = (
  state = createGame(),
  overrides: Partial<ComponentProps<typeof Home>> = {},
) => renderToStaticMarkup(createElement(Home, homeProps(state, overrides)));

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

function press(props: ComponentProps<typeof Home>, labelOrClass: string) {
  const control = findElement(
    Home(props),
    (element) =>
      element.type === "button" &&
      (element.props["aria-label"] === labelOrClass ||
        element.props.className === labelOrClass),
  );
  expect(control).toBeDefined();
  (control!.props.onClick as () => void)();
}

describe("home actions and recommendations", () => {
  it("explains the ten-piece box, cost, reserve and chances before opening", () => {
    const view = renderHome();
    expect(view).toContain("LE JOURNAL BRIGOS");
    expect(view).not.toMatch(/Brigo Club|BRIGO CLUB/);
    expect(view).toContain(`${BOX_DROP_COUNT} BRIGOS / BOÎTE`);
    expect(view).toContain("Aucune monnaie dépensée");
    expect(view).toContain("1 boîte utilisée");
    expect(view).toContain("16 % de Rare ou mieux");
    expect(view).toContain("Ouvrir 1 boîte");
    expect(view).toContain('aria-label="Choisir une boîte"');
    expect(renderToStaticMarkup(createElement(BoxArt, {}))).toContain(
      `${BOX_DROP_COUNT} CARTES`,
    );
  });

  it("suggests an unbuilt idea rather than an already completed first creation", () => {
    const supplied = adminCommand(
      createGame(),
      { type: "recipe", recipeId: "totem" },
      true,
    );
    const state = buildRecipe(supplied, "totem");
    const view = renderHome(state);
    expect(view).toContain("Le banc du parc");
    expect(view).not.toContain("Votre première création");
    expect(view).not.toContain("Objectif réalisé ! Choisissez");
  });

  it("keeps the player's followed large project and its actual required quantities", () => {
    const state = { ...createGame(), goalRecipeId: "astreval-gardens" };
    const view = renderHome(state);
    expect(view).toContain("VOTRE OBJECTIF");
    expect(view).toContain("Les jardins d’Astréval");
    expect(view).toContain("0 / 915 Brigos réunis");
  });

  it("disables an unaffordable opening while keeping the selected box price explicit", () => {
    const view = renderHome({
      ...createGame(),
      coins: 0,
      boxes: { discovery: 0, workshop: 0, prism: 0 },
    });
    expect(view).toMatch(
      /<button[^>]*disabled=""[^>]*>[^]*?Il manque 100 pièces/,
    );
    expect(view).toContain("Achat de 1 boîte");
    expect(view).toContain("100 pièces");
    expect(view).toContain('href="#journal"');
    expect(view).toContain("Gagner des pièces gratuitement");
  });

  it("keeps a single choice and opening counter before secondary content", () => {
    const view = renderHome();
    expect(view.match(/aria-label="Choisir la boîte /g)).toHaveLength(3);
    expect(view).toContain(
      'aria-pressed="true" aria-label="Choisir la boîte Découverte"',
    );
    expect(view).toContain('aria-describedby="boxes-opening-contract"');
    expect(view.indexOf("boxes-open-button")).toBeLessThan(
      view.indexOf("journal-invitation"),
    );
    expect(view).toContain('<details class="boxes-progression"><summary>');
    expect(view).not.toContain('boxes-progression" open');
  });

  it("signals earned rewards even while progression is collapsed", () => {
    let state = createGame();
    for (const recipeId of ["totem", "bench", "tree"]) {
      state = buildRecipe(
        adminCommand(state, { type: "recipe", recipeId }, true),
        recipeId,
      );
    }
    expect(renderHome(state)).toContain(
      '<span class="boxes-reward-count">1 à recevoir</span>',
    );
    expect(
      renderHome({ ...state, claimedAchievements: ["builder-variety"] }),
    ).not.toContain("boxes-reward-count");
  });

  it("selects a box without opening it or requiring a document or page jump", () => {
    const props = homeProps();
    press(props, "Choisir la boîte Prisme");
    expect(props.onSelectBox).toHaveBeenCalledExactlyOnceWith("prism");
    expect(props.onOpen).not.toHaveBeenCalled();
    expect(props.onOdds).not.toHaveBeenCalled();
  });

  it("opens a reserved box even with no coins, with an explicit free contract", () => {
    const state = { ...createGame(), coins: 0 };
    const props = homeProps(state);
    const view = renderHome(state);
    expect(view).toContain("Ouvrir 1 boîte");
    expect(view).toContain("Aucune monnaie dépensée.");
    expect(view).not.toContain("Il manque");
    expect(view).not.toContain("boxes-earn-note");
    press(props, "button button-primary boxes-open-button");
    expect(props.onOpen).toHaveBeenCalledExactlyOnceWith("discovery");
  });

  it("states the purchase and immediate opening when the selected reserve is empty", () => {
    const state = {
      ...createGame(),
      coins: 700,
      boxes: { discovery: 2, workshop: 0, prism: 0 },
    };
    const props = homeProps(state, { selectedBox: "prism" });
    const view = renderHome(state, { selectedBox: "prism" });
    expect(view).toContain("Acheter et ouvrir · 500 pièces");
    expect(view).toContain("puis ouverture immédiate.");
    expect(view).not.toContain("Aucune monnaie dépensée.");
    press(props, "button button-primary boxes-open-button");
    expect(props.onOpen).toHaveBeenCalledExactlyOnceWith("prism");
  });

  it("does not open an unaffordable box when its handler is invoked", () => {
    const props = homeProps({
      ...createGame(),
      coins: 0,
      boxes: { discovery: 0, workshop: 0, prism: 0 },
    });
    press(props, "button button-primary boxes-open-button");
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it.each([
    { ready: false, busy: false },
    { ready: true, busy: true },
  ])(
    "locks selection and opening until the game is ready and idle (%o)",
    (flags) => {
      const state = createGame();
      const props = homeProps(state, { game: { ...game(state), ...flags } });
      press(props, "Choisir la boîte Atelier");
      press(props, "button button-primary boxes-open-button");
      expect(props.onSelectBox).not.toHaveBeenCalled();
      expect(props.onOpen).not.toHaveBeenCalled();
    },
  );

  it("opens probabilities for each box independently from selection", () => {
    const props = homeProps();
    press(props, "Probabilités de la boîte Atelier");
    expect(props.onOdds).toHaveBeenCalledExactlyOnceWith("workshop");
    expect(props.onSelectBox).not.toHaveBeenCalled();
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("states the per-piece odds and does not claim a guaranteed rarity", () => {
    const view = renderToStaticMarkup(
      createElement(OddsContent, { game: game(createGame()), boxId: "prism" }),
    );
    expect(view).toContain(`chacun des ${BOX_DROP_COUNT} Brigos`);
    expect(view).toContain("Aucune rareté n’est garantie");
    expect(view).toContain("500 pièces");
  });

  it.each(BOX_IDS)(
    "présente les probabilités réelles de %s après une personnalisation admin",
    (boxId) => {
      const weights = {
        common: 70,
        uncommon: 20,
        rare: 7,
        epic: 2,
        legendary: 1,
      };
      const state = adminCommand(
        createGame(),
        { type: "rates", boxId, weights },
        true,
      );
      const chances = findElement(
        Home(homeProps(state, { selectedBox: boxId })),
        (element) => element.props.id === `boxes-${boxId}-chances`,
      );
      expect(chances).toBeDefined();
      expect(renderToStaticMarkup(chances!)).toContain("10 % de Rare ou mieux");

      const detail = renderToStaticMarkup(
        createElement(OddsContent, { game: game(state), boxId }),
      );
      for (const rarity of RARITIES) {
        expect(detail).toContain(`width:${weights[rarity]}%`);
        expect(detail).toContain(`<strong>${weights[rarity]} %</strong>`);
      }
      expect(detail).toContain("Aucune rareté n’est garantie par boîte");
      expect(detail).toContain(`${BOXES[boxId].cost} pièces`);
      expect(renderHome(state, { selectedBox: boxId })).not.toMatch(
        /(?:Rare|Épique|Légendaire) garanti/i,
      );
      expect(BOXES[boxId].weights).not.toEqual(weights);
    },
  );
});
