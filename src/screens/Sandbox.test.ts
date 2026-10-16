import { commandFixture, runCommandFixture } from "../game/commandTestUtils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "../game/catalog";
import { createGame } from "../game/engine";
import type { GameState } from "../game/engine";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";
import { SandboxWorld } from "../components/SandboxWorld";
import { Sandbox, sandboxPalette, SANDBOX_PALETTE_PAGE_SIZE } from "./Sandbox";
import type { Game } from "./types";

vi.mock("../components/BrigoArt", () => ({ BrigoArt: () => null }));
vi.mock("../components/SandboxWorld", () => ({
  SandboxWorld: vi.fn(() => null),
}));

const makeGame = (state: GameState, overrides: Partial<Game> = {}): Game => ({
  state,
  ready: true,
  busy: false,
  persistent: true,
  notice: null,
  notify: vi.fn(),
  act: vi.fn(async () => commandFixture(createGame())),
  ...overrides,
});
const render = (game: Game) =>
  renderToStaticMarkup(createElement(Sandbox, { game }));
beforeEach(() => vi.clearAllMocks());

describe("palette du bac à sable", () => {
  it("ne propose que les références réellement disponibles et ignore les références inconnues", () => {
    const owned = CATALOG[0],
      exhausted = CATALOG[1];
    expect(
      sandboxPalette({ [owned.id]: 2, [exhausted.id]: 0, unknown: 99 }).map(
        (item) => item.id,
      ),
    ).toEqual([owned.id]);
  });
  it("combine recherche sans accents, couleur et famille sans modifier le stock", () => {
    const brigo = CATALOG.find(
      (item) => item.color.id === "blue" && item.model.family === "brick",
    )!;
    const inventory = { [brigo.id]: 3, [CATALOG.at(-1)!.id]: 2 };
    const original = { ...inventory };
    expect(
      sandboxPalette(inventory, "ocean", "blue", "brick").map(
        (item) => item.id,
      ),
    ).toEqual([brigo.id]);
    expect(sandboxPalette(inventory, "ocean", "mint", "brick")).toEqual([]);
    expect(inventory).toEqual(original);
  });
  it("retrouve une pièce par son numéro de catalogue", () => {
    const brigo = CATALOG[0];
    expect(sandboxPalette({ [brigo.id]: 1 }, String(brigo.number))).toEqual([
      brigo,
    ]);
  });
});

describe("écran de construction libre", () => {
  it("explique le stock et la sauvegarde avant la création du premier espace", () => {
    const game = makeGame(createGame());
    const html = render(game);
    expect(html).toContain('href="#workshop"');
    expect(html).toContain("Créer mon espace");
    expect(html).toContain("Chaque pièce posée est prise dans votre stock");
    expect(html).toContain('maxLength="48"');
    expect(html).toContain("0 Brigos disponibles");
    expect(html).toContain("se sauvegardent à chaque geste");
    expect(game.act).not.toHaveBeenCalled();
  });
  it("n’expose que 24 choix de stock par page et conserve les actions clavier nommées", () => {
    let state = createGame();
    state.inventory = Object.fromEntries(
      CATALOG.slice(0, 30).map((item) => [item.id, 1]),
    );
    state = createSandboxProject(state, "Mon jardin libre");
    const html = render(makeGame(state));
    expect(SANDBOX_PALETTE_PAGE_SIZE).toBe(24);
    expect(html.match(/class="sandbox-stock-piece/g)).toHaveLength(24);
    expect(html).toContain('aria-label="Stock suivant"');
    expect(html).toContain('aria-label="Colonne X"');
    expect(html).toContain('aria-label="Ligne Y"');
    expect(html).toContain('aria-label="Choisir une pièce posée"');
    expect(html).toContain("Vue 3D");
    expect(html).toContain("Explorez votre création en 3D");
    expect(html).not.toContain("sandbox-scene-viewport");
    expect(html).not.toContain("sandbox-scene-zoom");
    expect(html).not.toContain('aria-label="Tourner le point de vue"');
    expect(html).toContain("Poser le Brigo");
    expect(html).toContain('aria-label="Poser des Brigos" aria-pressed="true"');
    expect(html).toContain(
      'aria-label="Modifier une pièce" aria-pressed="false"',
    );
    expect(html).toContain("Visez une surface pour empiler vos Brigos.");
    expect(html).toContain("Molette : zoomer");
    expect(html).toContain("Deux doigts pour zoomer ou déplacer la vue.");
    expect(html).toContain("Clavier : flèches pour viser, Entrée pour poser.");
    expect(html).toContain("Sauvegarde automatique");
    expect(vi.mocked(SandboxWorld).mock.calls.at(-1)?.[0]).toMatchObject({
      resetKey: state.sandboxProjects![0].id,
      disabled: false,
      selectedId: null,
      cursor: { x: 11, y: 11, z: 0 },
      candidateValid: true,
      interactionMode: "place",
      stackAutomatically: true,
    });
  });
  it("ne remet pas dans la palette un Brigo déjà posé et offre un accès aux boîtes", () => {
    const id = CATALOG[0].id;
    let state = createSandboxProject(
      { ...createGame(), inventory: { [id]: 1 } },
      "Une pièce",
    );
    state = placeSandboxBrigo(state, state.sandboxProjects![0].id, {
      brigoId: id,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
    });
    const html = render(makeGame(state));
    expect(html).not.toContain('class="sandbox-stock-piece');
    expect(html).toContain('href="#boxes"');
    expect(html).toContain("1 / 500 BRIGOS POSÉS");
    expect(html).toContain("Choisissez un Brigo dans votre stock.");
    expect(vi.mocked(SandboxWorld).mock.calls.at(-1)?.[0]).toMatchObject({
      candidate: null,
      candidateValid: false,
    });
  });
  it("désactive les mutations tant que la sauvegarde est occupée", () => {
    const state = createSandboxProject({
      ...createGame(),
      inventory: { [CATALOG[0].id]: 2 },
    });
    const game = makeGame(state, { busy: true });
    const html = render(game);
    expect(html).toContain("Sauvegarde…");
    expect(html).toMatch(/class="sandbox-primary" disabled=""[^>]*>/);
    expect(html).toContain('aria-label="Projet libre" disabled=""');
    expect(html).toContain(
      'aria-label="Poser des Brigos" aria-pressed="true" disabled=""',
    );
    expect(html).toContain(
      'aria-label="Modifier une pièce" aria-pressed="false" disabled=""',
    );
    expect(html).toMatch(
      /class="sandbox-stock-piece is-active"[^>]*disabled=""/,
    );
    const world = vi.mocked(SandboxWorld).mock.calls.at(-1)?.[0];
    expect(world).toMatchObject({ disabled: true, candidateValid: false });
    world?.onPlace?.();
    expect(game.act).not.toHaveBeenCalled();
  });
  it("réserve le Brigo exact lors de la confirmation depuis la vue 3D", () => {
    const id = CATALOG[0].id;
    let state = createSandboxProject({
      ...createGame(),
      inventory: { [id]: 2 },
    });
    const act = vi.fn(async (transform: Parameters<Game["act"]>[0]) => {
      const response = runCommandFixture(state, transform);
      state = response.state;
      return response;
    });
    render(makeGame(state, { act }));
    const world = vi.mocked(SandboxWorld).mock.calls.at(-1)?.[0];
    expect(world?.candidateValid).toBe(true);
    world?.onPlace?.();
    expect(act).toHaveBeenCalledOnce();
    expect(state.inventory[id]).toBe(1);
    expect(state.sandboxProjects![0].placements).toMatchObject([
      { brigoId: id, x: 11, y: 11, z: 0, rotation: 0 },
    ]);
  });
  it("échappe les noms des créations et n’active aucune suppression au simple rendu", () => {
    const game = makeGame(
      createSandboxProject(createGame(), '<script>alert("x")</script>'),
    );
    const html = render(game);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Démonter ce projet");
    expect(html).not.toContain("Démonter et supprimer");
    expect(game.act).not.toHaveBeenCalled();
  });
});
