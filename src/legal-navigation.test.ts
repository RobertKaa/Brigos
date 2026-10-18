// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameApp } from "./App";
import { createGame, openBox } from "./game/engine";
import type { Game } from "./screens/types";

vi.mock("./screens/Workshop", () => ({
  Workshop: ({ initialView }: { initialView: string }) =>
    createElement("h1", null, `Atelier ${initialView}`),
}));
vi.mock("./screens/Home", () => ({
  Home: () => createElement("h1", null, "Boîtes"),
  OddsContent: () => null,
}));
vi.mock("./components/OpeningModal", () => ({
  OpeningModal: () =>
    createElement("div", { role: "dialog" }, "Ouverture en attente"),
}));
vi.mock("./useTheme", () => ({
  useTheme: () => ({
    theme: "light",
    preference: "light",
    setPreference: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

let root: Root;
let container: HTMLDivElement;
let previousTitle: string;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  previousTitle = document.title = "Brigos · Jeu";
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  history.replaceState(null, "", "/");
  document.title = previousTitle;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function navigate(hash: string) {
  await act(async () => {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

function game(): Game {
  return {
    state: createGame(),
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    act: vi.fn(async () => null),
    notify: vi.fn(),
  };
}

describe("parcours des mentions légales", () => {
  it("conserve le retour à l’atelier, le focus et la partie sans envoyer de commande", async () => {
    await navigate("#workshop?view=built");
    const value = game();
    const before = structuredClone(value.state);
    const localWrite = vi.spyOn(Storage.prototype, "setItem");
    await act(async () => root.render(createElement(GameApp, { game: value })));
    const footer = container.querySelector("footer a")!;
    expect(footer.getAttribute("href")).toBe("#mentions-legales");
    await navigate(footer.getAttribute("href")!);
    expect(document.title).toBe("Mentions légales · Brigos");
    expect(document.activeElement?.id).toBe("main-content");
    expect(
      container.querySelector("footer a")?.getAttribute("aria-current"),
    ).toBe("page");
    const back = container.querySelector<HTMLAnchorElement>(".legal-return")!;
    expect(back.getAttribute("href")).toBe("#workshop?view=built");
    await navigate("#contact");
    expect(document.title).toBe("Contact · Brigos");
    await navigate("#faq");
    expect(document.title).toBe("FAQ · Brigos");
    expect(container.querySelector(".legal-return")?.getAttribute("href")).toBe(
      "#workshop?view=built",
    );
    expect(
      container
        .querySelector('footer a[href="#faq"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");
    await navigate("#mentions-legales");
    expect(container.querySelector(".legal-return")?.getAttribute("href")).toBe(
      "#workshop?view=built",
    );
    await navigate("#workshop?view=built");
    expect(container.querySelector("h1")?.textContent).toBe("Atelier built");
    expect(document.title).toBe("Brigos · Jeu");
    expect(value.state).toEqual(before);
    expect(value.act).not.toHaveBeenCalled();
    expect(localWrite).not.toHaveBeenCalled();
  });

  it.each([
    ["#mentions-legales", "Mentions légales"],
    ["#faq", "FAQ"],
  ])(
    "reste consultable sur %s avec une ouverture en attente, sans la terminer",
    async (hash, title) => {
      await navigate(hash);
      const value = game();
      value.state = openBox(value.state, "discovery");
      const pending = value.state.pendingOpening;
      await act(async () =>
        root.render(createElement(GameApp, { game: value })),
      );
      expect(container.querySelector("h1")?.textContent).toBe(title);
      expect(container.querySelector("[role=dialog]")).toBeNull();
      expect(
        container.querySelector(".legal-return")?.getAttribute("href"),
      ).toBe("#boxes");
      await navigate("#boxes");
      expect(container.querySelector("[role=dialog]")?.textContent).toBe(
        "Ouverture en attente",
      );
      expect(value.state.pendingOpening).toBe(pending);
      expect(value.act).not.toHaveBeenCalled();
    },
  );
  it("rend la FAQ accessible avant le chargement de la partie", async () => {
    await navigate("#faq");
    const value = { ...game(), ready: false };
    await act(async () => root.render(createElement(GameApp, { game: value })));
    expect(container.querySelector("h1")?.textContent).toBe("FAQ");
    expect(container.querySelector("main")?.getAttribute("aria-busy")).toBe(
      "false",
    );
    expect(value.act).not.toHaveBeenCalled();
  });
});
