// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameApp } from "../App";
import { createGame } from "../game/engine";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";
import { exposeSandboxProject } from "../game/freeGallery";
import { FreeMode } from "./FreeMode";
import { Sandbox } from "./Sandbox";
import type { Game } from "./types";

vi.mock("./Sandbox", () => ({
  Sandbox: vi.fn(({ initialProjectId }: { initialProjectId?: string }) =>
    createElement("h1", null, `Éditeur ${initialProjectId ?? "en cours"}`),
  ),
}));
vi.mock("../components/FreeCreationPreview", () => ({
  FreeCreationPreview: () =>
    createElement("div", null, "Aperçu de construction"),
}));
const NOW = Date.parse("2026-10-18T12:00:00Z"),
  BRIGO = "brick-1x1:coral";
let root: Root, container: HTMLDivElement;
function session(): Game {
  let state = createSandboxProject(
    { ...createGame(), inventory: { [BRIGO]: 1 }, discovered: [BRIGO] },
    "Mon jardin",
    NOW,
  );
  state = placeSandboxBrigo(
    state,
    state.sandboxProjects![0].id,
    { brigoId: BRIGO, x: 1, y: 1, z: 0, rotation: 0 },
    NOW,
  );
  return {
    state,
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    act: vi.fn(async () => null),
    notify: vi.fn(),
  };
}
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  history.replaceState(null, "", "/#sandbox");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const render = async (
  game: Game,
  props: Partial<Parameters<typeof FreeMode>[0]> = {},
) => {
  await act(async () =>
    root.render(createElement(FreeMode, { game, ...props })),
  );
};
const button = (label: string) =>
  [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) => item.textContent === label,
  )!;
async function navigate(hash: string) {
  await act(async () => {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("galerie intégrée au mode Libre", () => {
  it("revient à la galerie pour un projet supprimé au lieu d’ouvrir un autre éditeur", async () => {
    await render(session(), { view: "build", projectId: "deleted-project" });
    expect(container.querySelector("h1")?.textContent).toBe("Ma galerie");
    expect(container.textContent).toContain("Ce projet n’est plus disponible");
    expect(Sandbox).not.toHaveBeenCalled();
  });
  it("actualise une exposition sans renvoyer son empreinte serveur dans la commande", async () => {
    const game = session(),
      projectId = game.state.sandboxProjects![0].id;
    game.state = exposeSandboxProject(
      game.state,
      projectId,
      "Mon jardin",
      { description: "Conservée", rotation: 180, backgroundId: "ink" },
      NOW,
    );
    await render(game, { view: "exhibit", projectId });
    await act(async () => button("Présentation").click());
    await act(async () =>
      container
        .querySelector("dialog form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(game.act).toHaveBeenCalledWith(
      {
        type: "expose-project",
        projectId,
        name: "Mon jardin",
        description: "Conservée",
        rotation: 180,
        backgroundId: "ink",
      },
      expect.any(String),
    );
  });
  it("ouvre la galerie avec tous les projets existants et ne monte pas l’éditeur", async () => {
    const game = session();
    const before = structuredClone(game.state);
    await render(game);
    expect(container.querySelector("h1")?.textContent).toBe("Ma galerie");
    expect(container.querySelector(".free-card h3")?.textContent).toBe(
      "Mon jardin",
    );
    expect(
      container.querySelector('.free-tabs [aria-current="page"]')?.textContent,
    ).toBe("Ma galerie");
    expect(Sandbox).not.toHaveBeenCalled();
    expect(game.act).not.toHaveBeenCalled();
    expect(game.state).toEqual(before);
    expect(
      container
        .querySelector('.free-card a[href*="view=build"]')
        ?.getAttribute("href"),
    ).toBe(`#sandbox?view=build&project=${game.state.sandboxProjects![0].id}`);
  });
  it("le vrai menu du jeu mène à la galerie, puis au projet choisi, et conserve le retour depuis la FAQ", async () => {
    const game = session();
    await act(async () => root.render(createElement(GameApp, { game })));
    expect(container.querySelector(".free-heading h1")?.textContent).toBe(
      "Ma galerie",
    );
    const id = game.state.sandboxProjects![0].id,
      href = `#sandbox?view=build&project=${id}`;
    await navigate(href);
    expect(vi.mocked(Sandbox).mock.calls.at(-1)?.[0].initialProjectId).toBe(id);
    await navigate("#faq");
    expect(container.querySelector(".legal-return")?.getAttribute("href")).toBe(
      href,
    );
    await navigate("#sandbox");
    expect(container.querySelector(".free-heading h1")?.textContent).toBe(
      "Ma galerie",
    );
    expect(game.act).not.toHaveBeenCalled();
  });
  it("crée un nouveau projet avant d’ouvrir son éditeur, sans réutiliser silencieusement le précédent", async () => {
    const game = session();
    game.act = vi.fn(async () => ({
      state: game.state,
      revision: 1,
      serverTime: new Date(NOW).toISOString(),
      result: { projectId: "new-project" },
      replayed: false,
    }));
    await render(game);
    await act(async () => button("Nouvelle création").click());
    expect(game.act).toHaveBeenCalledWith(
      { type: "create-project" },
      expect.any(String),
    );
    expect(location.hash).toBe("#sandbox?view=build&project=new-project");
  });
  it("conserve dans l’adresse le projet choisi dans l’éditeur et revient à la galerie après démontage", async () => {
    const game = session(),
      projectId = game.state.sandboxProjects![0].id;
    await render(game, { view: "build", projectId });
    const editor = vi.mocked(Sandbox).mock.calls.at(-1)![0];
    await act(async () => editor.onProjectChanged?.("another-project"));
    expect(location.hash).toBe("#sandbox?view=build&project=another-project");
    await act(async () => editor.onProjectDeleted?.());
    expect(location.hash).toBe("#sandbox");
  });
  it("conserve la présentation après un échec et rend le focus après Échap", async () => {
    const game = session();
    await render(game);
    const trigger = button("Exposer");
    trigger.focus();
    await act(async () => trigger.click());
    const input = container.querySelector<HTMLInputElement>("dialog input")!;
    expect(document.activeElement).toBe(input);
    await act(async () =>
      container
        .querySelector("dialog form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "champs sont conservés",
    );
    expect(input.value).toBe("Mon jardin");
    await act(async () =>
      container
        .querySelector("dialog")!
        .dispatchEvent(new Event("cancel", { cancelable: true })),
    );
    expect(container.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("attend la réponse avant d’ouvrir l’exposition et bloque les doubles soumissions", async () => {
    const game = session(),
      id = game.state.sandboxProjects![0].id;
    let resolve!: (value: Awaited<ReturnType<Game["act"]>>) => void;
    game.act = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<Game["act"]>>>((done) => {
          resolve = done;
        }),
    );
    await render(game);
    await act(async () => button("Exposer").click());
    const form = container.querySelector("dialog form")!;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(game.act).toHaveBeenCalledTimes(1);
    expect(location.hash).toBe("#sandbox");
    expect(container.querySelector('button[type="submit"]')?.textContent).toBe(
      "Enregistrement…",
    );
    const state = exposeSandboxProject(
      game.state,
      id,
      "Mon jardin",
      { description: "", rotation: 0, backgroundId: "paper" },
      NOW,
    );
    await act(async () =>
      resolve({
        state,
        revision: 1,
        serverTime: new Date(NOW).toISOString(),
        result: {},
        replayed: false,
      }),
    );
    expect(container.querySelector("dialog")).toBeNull();
    expect(location.hash).toBe(`#sandbox?view=exhibit&project=${id}`);
  });
  it("affiche les états vide et chargement et protège les mutations pendant une sauvegarde", async () => {
    const game = { ...session(), state: createGame(), ready: false };
    await render(game);
    expect(container.textContent).toContain("Chargement de vos créations");
    expect(button("Nouvelle création").disabled).toBe(true);
    await render({ ...game, ready: true });
    expect(container.textContent).toContain(
      "Votre première création mérite sa place ici",
    );
    const empty = createSandboxProject(game.state, "Vide", NOW);
    await render({ ...game, state: empty, ready: true });
    expect(button("Exposer").disabled).toBe(true);
    await render({ ...session(), busy: true });
    expect(button("Exposer").disabled).toBe(true);
  });
  it("affiche les textes importés sans markup et signale une présentation à actualiser", async () => {
    const game = session(),
      id = game.state.sandboxProjects![0].id;
    game.state = exposeSandboxProject(
      game.state,
      id,
      "<script>x</script>",
      {
        description: "<img src=x onerror=alert(1)>",
        rotation: 0,
        backgroundId: "paper",
      },
      NOW,
    );
    game.state.sandboxProjects![0].placements[0].x = 2;
    await render(game, { view: "exhibit", projectId: id });
    expect(container.querySelector("h1")?.textContent).toBe(
      "<script>x</script>",
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector(".free-description img")).toBeNull();
    expect(container.textContent).toContain("Cette création a changé");
  });
});
