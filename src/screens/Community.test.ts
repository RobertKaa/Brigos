// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Community } from "./Community";
import { CommunityError } from "../community";
import type { CommunityApi } from "../community";
import { readAppRoute } from "../navigation";
import { createGame } from "../game/engine";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";
import { exposeSandboxProject } from "../game/freeGallery";
import { GameApp } from "../App";
import type { Game } from "./types";
vi.mock("../components/FreeCreationPreview", () => ({
  FreeCreationPreview: () => createElement("div", null, "Aperçu Brigos"),
}));
const ID = "10000000-0000-4000-8000-000000000001",
  CREATION = "20000000-0000-4000-8000-000000000002";
const profile = {
  id: ID,
  pseudo: "Trebor",
  bio: "<img src=x onerror=alert(1)>",
  avatar: "coral",
  publishedCount: 1,
  featuredCreationId: CREATION,
};
const creation = {
  id: CREATION,
  title: "Jardin",
  description: "Un jardin",
  rotation: 0,
  backgroundId: "paper",
  placements: [{ brigoId: "brick-1x1:coral", x: 1, y: 1, z: 0, rotation: 0 }],
  publishedAt: "2026-10-18T12:00:00Z",
  author: profile,
};
let root: Root,
  host: HTMLDivElement,
  api: CommunityApi,
  game: Game,
  account: () => void;
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
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
  history.replaceState(null, "", "/#community");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  let state = createSandboxProject(
    {
      ...createGame(),
      inventory: { "brick-1x1:coral": 1 },
      discovered: ["brick-1x1:coral"],
    },
    "Jardin",
  );
  const id = state.sandboxProjects![0].id;
  state = placeSandboxBrigo(state, id, {
    brigoId: "brick-1x1:coral",
    x: 1,
    y: 1,
    z: 0,
    rotation: 0,
  });
  state = exposeSandboxProject(state, id, "Jardin", {
    description: "",
    rotation: 0,
    backgroundId: "paper",
  });
  game = {
    state,
    ready: true,
    busy: false,
    persistent: true,
    mode: "connected",
    notice: null,
    act: vi.fn(),
    notify: vi.fn(),
  };
  account = vi.fn();
  api = {
    request: vi.fn(async (action) => {
      if (action === "mine" || action === "save-profile")
        return {
          profile: { ...profile, visible: true, moderated: false, revision: 0 },
          creations: [],
        };
      if (action === "creation") return { creation };
      if (action === "players")
        return { items: [profile], hasMore: true, profile: null };
      if (action === "profile")
        return { items: [creation], hasMore: false, profile };
      if (action === "publish" || action === "unpublish" || action === "report")
        return { ok: true };
      return { items: [creation], hasMore: false, profile: null };
    }),
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function render(hash = "#community", signedIn = true) {
  history.replaceState(null, "", `/${hash}`);
  await act(async () =>
    root.render(
      createElement(Community, {
        game,
        route: readAppRoute(hash),
        api,
        signedIn,
        onOpenAccount: account,
      }),
    ),
  );
}
const button = (label: string) =>
  [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent === label,
  )!;
async function submit(form: Element) {
  await act(async () =>
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
}
describe("integrated community journeys", () => {
  it("defers preview generation until a card approaches the viewport", async () => {
    let reveal!: (entries: IntersectionObserverEntry[]) => void;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
          reveal = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    await render();
    expect(host.textContent).not.toContain("Aperçu Brigos");
    await act(async () =>
      reveal([{ isIntersecting: true } as IntersectionObserverEntry]),
    );
    expect(host.textContent).toContain("Aperçu Brigos");
    expect(disconnect).toHaveBeenCalled();
  });
  it("explains an empty filtered search and offers no broken profile or creation link", async () => {
    vi.mocked(api.request).mockResolvedValue({
      items: [],
      hasMore: false,
      profile: null,
    });
    await render("#community?q=introuvable");
    expect(host.textContent).toContain("Aucun résultat");
    expect(host.querySelector(".community-creation-card")).toBeNull();
    expect(host.querySelector(".community-pager a")).toBeNull();
  });
  it("restores the directory scroll position and focused profile link after a visit", async () => {
    const hash = "#community?tab=players&q=Trebor&page=2";
    await render(hash);
    vi.stubGlobal("scrollY", 420);
    const link = host.querySelector<HTMLAnchorElement>(
      ".community-player-card",
    )!;
    link.addEventListener("click", (event) => event.preventDefault());
    await act(async () => {
      link.focus();
      link.click();
    });
    await render(link.getAttribute("href")!);
    await render(hash);
    expect(document.activeElement).toBe(
      host.querySelector(".community-player-card"),
    );
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 420,
      behavior: "instant",
    });
  });
  it("keeps an unsaved profile draft while publishing a different creation", async () => {
    await render("#community?tab=mine");
    const input = host.querySelector<HTMLInputElement>(
      ".community-profile-form input",
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Mon nouveau pseudo");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Publier cette création").click());
    expect(
      host.querySelector<HTMLInputElement>(".community-profile-form input")
        ?.value,
    ).toBe("Mon nouveau pseudo");
  });
  it("offers guests an account without exposing local projects or requesting data", async () => {
    await render("#community", false);
    expect(host.textContent).toContain("partie invitée reste privée");
    expect(host.textContent).not.toContain("Jardin");
    expect(api.request).not.toHaveBeenCalled();
    await act(async () => button("Ouvrir mon compte").click());
    expect(account).toHaveBeenCalledOnce();
  });
  it("opens the real gallery and directory from the app while preserving five primary destinations", async () => {
    await act(async () =>
      root.render(
        createElement(GameApp, {
          game,
          communityApi: api,
          onOpenAccount: account,
        }),
      ),
    );
    expect(
      host.querySelectorAll('[aria-label="Navigation principale"] a'),
    ).toHaveLength(5);
    expect(host.querySelector("h1")?.textContent).toBe("Galeries des joueurs");
    expect(
      host.querySelector('a[href="#community?tab=players"]'),
    ).not.toBeNull();
    expect(
      host.querySelector(`a[href="#community?creation=${CREATION}"]`),
    ).not.toBeNull();
  });
  it("preserves directory search, page and profile gallery context in links", async () => {
    await render("#community?tab=players&q=Trebor&page=2");
    const link = [...host.querySelectorAll<HTMLAnchorElement>("a")].find(
      (a) =>
        a.textContent?.includes("Trebor") &&
        a.classList.contains("community-player-card"),
    )!;
    expect(link.getAttribute("href")).toContain(
      `tab=players&q=Trebor&page=2&player=${ID}`,
    );
    await render(link.getAttribute("href")!);
    expect(
      host.querySelector('a[href="#community?tab=players&q=Trebor&page=2"]'),
    ).not.toBeNull();
    const detail = [...host.querySelectorAll<HTMLAnchorElement>("a")].find(
      (a) => a.getAttribute("href")?.includes(`creation=${CREATION}`),
    )!;
    await render(detail.getAttribute("href")!);
    expect(host.textContent).toContain("Par Trebor");
    expect(
      host.querySelector(
        `a[href="#community?tab=players&q=Trebor&page=2&player=${ID}"]`,
      ),
    ).not.toBeNull();
    expect(game.act).not.toHaveBeenCalled();
  });
  it("renders player text as text and sends only bounded search parameters", async () => {
    await render("#community?tab=players&q=%25&page=2");
    expect(api.request).toHaveBeenCalledWith("players", { q: "%", page: 2 });
    expect(host.querySelector('img[src="x"]')).toBeNull();
    expect(host.textContent).toContain("<img src=x onerror=alert(1)>");
  });
  it("keeps local exposure private until a separate publish action, sending only the project ID", async () => {
    await render("#community?tab=mine");
    expect(host.textContent).toContain("Privée · vous seul la voyez");
    expect(api.request).toHaveBeenCalledTimes(1);
    await act(async () => button("Publier cette création").click());
    expect(api.request).toHaveBeenCalledWith("publish", {
      projectId: game.state.sandboxProjects![0].id,
    });
    expect(game.act).not.toHaveBeenCalled();
  });
  it("starts an absent profile hidden and blocks publishing before consent", async () => {
    vi.mocked(api.request).mockResolvedValue({ profile: null, creations: [] });
    await render("#community?tab=mine");
    expect(
      host.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked,
    ).toBe(false);
    expect(button("Publier cette création").disabled).toBe(true);
    expect(button("Enregistrer mon profil").disabled).toBe(true);
  });
  it("locks publication during a lost/slow response and preserves the project", async () => {
    let finish!: (value: unknown) => void;
    const initial = api.request;
    api.request = vi.fn((action, input) =>
      action === "publish"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : initial(action, input),
    );
    await render("#community?tab=mine");
    await act(async () => {
      button("Publier cette création").click();
      button("Publier cette création").click();
    });
    expect(
      vi.mocked(api.request).mock.calls.filter(([a]) => a === "publish"),
    ).toHaveLength(1);
    expect(button("Publier cette création").disabled).toBe(true);
    await act(async () => finish({ ok: true }));
    expect(host.textContent).toContain("La création est partagée");
    expect(game.state.sandboxProjects).toHaveLength(1);
  });
  it("keeps profile fields after a rejected save and protects edits when switching windows", async () => {
    const initial = api.request;
    api.request = vi.fn((action, input) =>
      action === "save-profile"
        ? Promise.reject(new CommunityError("Vérifiez les champs"))
        : initial(action, input),
    );
    await render("#community?tab=mine");
    await submit(host.querySelector(".community-profile-form")!);
    expect(host.textContent).toContain("Vérifiez les champs");
    expect(
      host.querySelector<HTMLInputElement>(".community-profile-form input")
        ?.value,
    ).toBe("Trebor");
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(
      host.querySelector<HTMLInputElement>(".community-profile-form input")
        ?.value,
    ).toBe("Trebor");
  });
  it("revalidates a direct creation on focus and removes withdrawn data", async () => {
    await render(`#community?creation=${CREATION}`);
    expect(host.textContent).toContain("Un jardin");
    vi.mocked(api.request).mockRejectedValue(
      new CommunityError(
        "Ce profil ou cette création n’est plus disponible.",
        "NOT_FOUND",
      ),
    );
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(host.textContent).not.toContain("Un jardin");
    expect(host.textContent).toContain("n’est plus disponible");
  });
  it("ignores a late public response after navigating to a different view", async () => {
    let finish!: (value: unknown) => void;
    const initial = api.request;
    api.request = vi.fn((action, input) =>
      action === "players"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : initial(action, input),
    );
    await render("#community?tab=players");
    expect(host.textContent).toContain("se préparent");
    await render("#community?tab=mine");
    await act(async () =>
      finish({ items: [profile], hasMore: false, profile: null }),
    );
    expect(host.querySelector(".community-player-card")).toBeNull();
    expect(host.textContent).toContain("Mon profil de joueur");
  });
  it("submits a native report dialog and restores focus to its trigger", async () => {
    await render(`#community?creation=${CREATION}`);
    const trigger = button("Signaler cette création");
    await act(async () => {
      trigger.focus();
      trigger.click();
    });
    const dialog = host.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    await submit(dialog.querySelector("form")!);
    expect(api.request).toHaveBeenCalledWith("report", {
      id: CREATION,
      kind: "creation",
      reason: "inappropriate",
    });
    expect(host.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
