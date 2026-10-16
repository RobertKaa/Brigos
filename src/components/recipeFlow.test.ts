import { commandFixture, runCommandFixture } from "../game/commandTestUtils";
import { Children, createElement, isValidElement } from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RecipeDetail } from "./DetailModals";
import { RecipeOrder } from "./PieceEconomy";
import { RECIPE_BY_ID } from "../game/catalog";
import {
  adminCommand,
  createGame,
  inventoryCount,
  recipeProgress,
  reservedCount,
} from "../game/engine";
import type { GameState } from "../game/engine";
import { recipeOrderQuote } from "../game/market";
import { playerProgress, recipeXp } from "../game/progression";
import type { Game } from "../screens/types";

const recipe = RECIPE_BY_ID.get("totem")!;
type DetailProps = ComponentProps<typeof RecipeDetail>;

function makeGame(state: GameState, overrides: Partial<Game> = {}): Game {
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

function makeProps(
  game: Game,
  overrides: Partial<DetailProps> = {},
): DetailProps {
  return {
    recipe,
    game,
    adminEnabled: false,
    admin: vi.fn(async () => false),
    onClose: vi.fn(),
    onBuilt: vi.fn(),
    ...overrides,
  };
}

// Keep the actual event callbacks while React supplies the hooks dispatcher.
// The rendered tree uses no repository and cannot read or change a player save.
function detailElement(props: DetailProps) {
  let tree: ReactNode = null;
  function InspectDetail() {
    tree = RecipeDetail(props);
    return tree;
  }
  renderToStaticMarkup(createElement(InspectDetail));
  return tree;
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
}

function assemblyButton(props: DetailProps) {
  const nextAction = findElement(
    detailElement(props),
    (element) => element.props["aria-label"] === "Prochaine étape du plan",
  );
  const button = findElement(
    nextAction,
    (element) => element.type === "button",
  );
  expect(button).toBeDefined();
  return button!;
}

function press(element: ReactElement<Record<string, unknown>>) {
  (element.props.onClick as () => void)();
}

function suppliedState() {
  return adminCommand(
    createGame(),
    { type: "recipe", recipeId: recipe.id },
    true,
  );
}

/** A delayed commit makes navigation before save success observable. */
function deferredGame(initial: GameState) {
  let current = initial;
  let finish!: (success: boolean) => void;
  const completion = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  const act = vi.fn(async (transform: Parameters<Game["act"]>[0]) => {
    const success = await completion;
    if (success) current = runCommandFixture(current, transform).state;
    return success ? commandFixture(current) : null;
  });
  return {
    game: makeGame(initial, { act }),
    state: () => current,
    settle: async (success: boolean) => {
      finish(success);
      await completion;
      await Promise.resolve();
    },
  };
}

describe("parcours du plan à la création", () => {
  it("réserve les vrais Brigos et accorde l’XP avant de rejoindre les créations après sauvegarde", async () => {
    const before = suppliedState();
    const session = deferredGame(before);
    const props = makeProps(session.game);
    const button = assemblyButton(props);
    expect(button.props.disabled).toBe(false);

    press(button);
    expect(session.game.act).toHaveBeenCalledOnce();
    expect(props.onBuilt).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(session.state()).toBe(before);

    await session.settle(true);
    const after = session.state();
    expect(after.constructions).toHaveLength(1);
    expect(after.constructions[0].recipeId).toBe(recipe.id);
    for (const [id, quantity] of Object.entries(
      after.constructions[0].pieces,
    )) {
      expect((before.inventory[id] ?? 0) - (after.inventory[id] ?? 0)).toBe(
        quantity,
      );
    }
    expect(inventoryCount(after) + reservedCount(after)).toBe(
      inventoryCount(before),
    );
    expect(recipeProgress(after, recipe).canBuild).toBe(false);
    expect(playerProgress(after).xp - playerProgress(before).xp).toBe(
      recipeXp(recipe),
    );
    expect(after.coins).toBe(before.coins);
    expect(props.onBuilt).toHaveBeenCalledOnce();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("garde la fiche et les ressources intactes si la sauvegarde refuse l’assemblage", async () => {
    const before = suppliedState();
    const session = deferredGame(before);
    const props = makeProps(session.game);
    press(assemblyButton(props));
    await session.settle(false);
    expect(session.state()).toBe(before);
    expect(props.onBuilt).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("conserve la fermeture après succès pour les appelants sans destination dédiée", async () => {
    const session = deferredGame(suppliedState());
    const props = makeProps(session.game, { onBuilt: undefined });
    press(assemblyButton(props));
    expect(props.onClose).not.toHaveBeenCalled();
    await session.settle(true);
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it.each([
    { ready: false, busy: false },
    { ready: true, busy: true },
  ])(
    "désactive l’assemblage pendant le chargement ou une action en cours : %o",
    (flags) => {
      const game = makeGame(suppliedState(), flags);
      expect(assemblyButton(makeProps(game)).props.disabled).toBe(true);
      expect(game.act).not.toHaveBeenCalled();
    },
  );

  it("propose une commande à la place de l’assemblage quand le stock est incomplet", () => {
    const props = makeProps(makeGame(createGame()));
    const tree = detailElement(props);
    const nextAction = findElement(
      tree,
      (element) => element.props["aria-label"] === "Prochaine étape du plan",
    );
    const order = findElement(
      nextAction,
      (element) => element.type === RecipeOrder,
    );
    expect(order).toBeDefined();
    expect(order!.props.onNavigate).toBe(props.onClose);
    expect(
      findElement(nextAction, (element) => element.type === "button"),
    ).toBeUndefined();
  });
});

describe("parcours des pièces manquantes", () => {
  it("ferme la fiche pour accéder aux quêtes lorsque la commande est trop chère", () => {
    const game = makeGame({ ...createGame(), coins: 0 });
    const props = makeProps(game);
    const nestedOrder = findElement(
      detailElement(props),
      (element) => element.type === RecipeOrder,
    )!;
    const orderProps = nestedOrder.props as ComponentProps<typeof RecipeOrder>;
    const tree = RecipeOrder(orderProps);
    const link = findElement(
      tree,
      (element) => element.type === "a" && element.props.href === "#journal",
    );
    const button = findElement(tree, (element) => element.type === "button");
    const html = renderToStaticMarkup(createElement(RecipeOrder, orderProps));
    expect(button!.props.disabled).toBe(true);
    expect(html).toContain("Monnaie insuffisante");
    expect(html).toContain("Gagner des pièces avec les quêtes");
    expect(link).toBeDefined();
    press(link!);
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onBuilt).not.toHaveBeenCalled();
    expect(game.act).not.toHaveBeenCalled();
  });

  it("commande uniquement les pièces manquantes sans assembler ni attribuer d’XP", async () => {
    const alreadyOwned = Object.keys(suppliedState().inventory)[0];
    const initial = {
      ...createGame(),
      coins: 10_000,
      inventory: { [alreadyOwned]: 1 },
      discovered: [alreadyOwned],
    };
    const quote = recipeOrderQuote(initial, recipe);
    const session = deferredGame(initial);
    const onNavigate = vi.fn();
    const tree = RecipeOrder({ recipe, game: session.game, onNavigate });
    const button = findElement(tree, (element) => element.type === "button")!;
    expect(button.props.disabled).toBe(false);
    press(button);
    await session.settle(true);
    const after = session.state();
    expect(after.coins).toBe(initial.coins - quote.cost);
    expect(inventoryCount(after) - inventoryCount(initial)).toBe(quote.count);
    expect(recipeProgress(after, recipe).canBuild).toBe(true);
    expect(after.constructions).toEqual(initial.constructions);
    expect(playerProgress(after).xp).toBe(playerProgress(initial).xp);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it.each([
    { ready: false, busy: false },
    { ready: true, busy: true },
  ])("verrouille aussi la commande durant une autre action : %o", (flags) => {
    const game = makeGame({ ...createGame(), coins: 10_000 }, flags);
    const button = findElement(
      RecipeOrder({ recipe, game }),
      (element) => element.type === "button",
    )!;
    expect(button.props.disabled).toBe(true);
    expect(game.act).not.toHaveBeenCalled();
  });
});
