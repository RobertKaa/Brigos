// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "./engine";
import type { GameState } from "./engine";
import { applyGameCommand } from "./commands";
import type { CommandRequest, CommandResponse, GameSnapshot } from "./commands";
import type { GameTransport } from "./remote";
import { RemoteGameError } from "./remote";
import type { Repository } from "./storage";
import { useGame } from "./useGame";

const mocks = vi.hoisted(() => ({
  connectRepository: vi.fn(),
  getSupabaseClient: vi.fn(),
  transport: vi.fn(),
}));
vi.mock("./storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./storage")>()),
  connectRepository: mocks.connectRepository,
}));
vi.mock("../auth/client", () => ({
  getSupabaseClient: mocks.getSupabaseClient,
}));
vi.mock("./remote", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./remote")>()),
  supabaseGameTransport: mocks.transport,
}));

type Game = ReturnType<typeof useGame>;
type Identity = Parameters<typeof useGame>[0];
const serverTime = "2026-10-16T09:00:00.000Z";
const roots: Root[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function snapshot(
  coins: number,
  revision = 0,
  time = serverTime,
): GameSnapshot {
  return { state: { ...createGame(), coins }, revision, serverTime: time };
}
function response(saved: GameSnapshot, replayed = false): CommandResponse {
  return { ...saved, result: {}, replayed };
}
function localRepository(
  coins = 777,
): Repository & { saved: () => GameSnapshot } {
  let current = snapshot(coins);
  return {
    load: vi.fn(async () => ({
      state: current.state,
      revision: current.revision,
    })),
    commit: vi.fn(async (state: GameState, expected: number) => {
      expect(expected).toBe(current.revision);
      current = { ...current, state, revision: expected + 1 };
      return current.revision;
    }),
    close: vi.fn(),
    saved: () => current,
  };
}
function cloud(saved = snapshot(100)): GameTransport & {
  read: ReturnType<typeof vi.fn<() => Promise<GameSnapshot>>>;
  execute: ReturnType<
    typeof vi.fn<(request: CommandRequest) => Promise<CommandResponse>>
  >;
} {
  let current = saved;
  return {
    read: vi.fn(async () => current),
    execute: vi.fn(async (request: CommandRequest) => {
      const applied = applyGameCommand(
        current.state,
        request.command,
        Date.parse(serverTime),
      );
      current = {
        ...current,
        state: applied.state,
        revision: current.revision + 1,
      };
      return { ...response(current), result: applied.result };
    }),
  };
}
async function mount(identity: Identity = {}) {
  let value!: Game;
  const rendered: Game[] = [];
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  roots.push(root);
  function Harness(props: { identity: Identity }) {
    value = useGame(props.identity);
    rendered.push(value);
    return null;
  }
  const render = async (next: Identity) => {
    await act(async () => {
      root.render(createElement(Harness, { identity: next }));
    });
  };
  await render(identity);
  return { current: () => value, render, rendered };
}
async function run<T>(callback: () => T | Promise<T>) {
  let result!: T;
  await act(async () => {
    result = await callback();
  });
  return result;
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.connectRepository.mockReset().mockResolvedValue(localRepository());
  mocks.getSupabaseClient.mockReset().mockReturnValue({});
  mocks.transport.mockReset().mockReturnValue(cloud());
  window.sessionStorage.clear();
});
afterEach(async () => {
  for (const root of roots.splice(0))
    await act(async () => {
      root.unmount();
    });
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("sessions React locales et connectées", () => {
  it("attend l’identité Auth puis charge une partie serveur neuve de révision zéro sans accéder à IndexedDB", async () => {
    const remote = cloud(snapshot(100, 0));
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ authReady: false });
    expect(hook.current().ready).toBe(false);
    expect(mocks.connectRepository).not.toHaveBeenCalled();
    expect(mocks.transport).not.toHaveBeenCalled();
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();

    await hook.render({ userId: "alice", authReady: true });
    expect(hook.current()).toMatchObject({ ready: true, mode: "connected" });
    expect(mocks.transport).toHaveBeenCalledWith(expect.anything(), "alice");
    expect(
      await run(() =>
        hook.current().localAct((state) => ({ ...state, coins: 999_999 })),
      ),
    ).toBe(false);
    const confirmed = await run(() =>
      hook.current().act({ type: "preferences", sound: false }),
    );
    expect(confirmed?.revision).toBe(1);
    expect(remote.execute.mock.calls[0][0].expectedRevision).toBe(0);
    expect(hook.current().state.preferences.sound).toBe(false);
    expect(mocks.connectRepository).not.toHaveBeenCalled();
  });

  it("n’effectue aucune lecture avec une identité encore en cours de vérification", async () => {
    const hook = await mount({ authReady: false, userId: "alice" });
    await run(() => hook.current().refresh());
    expect(mocks.getSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.transport).not.toHaveBeenCalled();
    expect(mocks.connectRepository).not.toHaveBeenCalled();
    expect(hook.current().ready).toBe(false);
  });

  it("conserve la sauvegarde invitée séparément pendant connexion, actions serveur et déconnexion", async () => {
    const local = localRepository(777);
    mocks.connectRepository.mockResolvedValue(local);
    const hook = await mount();
    expect(hook.current().state.coins).toBe(777);
    await run(() => hook.current().act({ type: "preferences", sound: false }));
    const localBeforeSignIn = structuredClone(local.saved());

    await hook.render({ userId: "alice" });
    expect(hook.current().state.coins).toBe(100);
    await run(() => hook.current().act({ type: "claim-visit" }));
    expect(local.saved()).toEqual(localBeforeSignIn);
    expect(local.commit).toHaveBeenCalledTimes(1);
    const switchStart = hook.rendered.length;
    await hook.render({ userId: null });
    expect(hook.current().ready).toBe(true);
    expect(hook.current().state.coins).toBe(777);
    expect(hook.current().state.preferences.sound).toBe(false);
    expect(
      hook.rendered
        .slice(switchStart)
        .every((game) => game.state.coins !== 100),
    ).toBe(true);
    expect(mocks.connectRepository).toHaveBeenCalledTimes(2);
  });

  it("ignore le chargement tardif d’un compte quitté et masque immédiatement son état", async () => {
    const delayed = deferred<GameSnapshot>();
    const alice = cloud();
    alice.read.mockReturnValue(delayed.promise);
    mocks.transport
      .mockReturnValueOnce(alice)
      .mockReturnValueOnce(cloud(snapshot(222)));
    const hook = await mount({ userId: "alice" });
    expect(hook.current().ready).toBe(false);
    await hook.render({ userId: "bob" });
    expect(hook.current().state.coins).toBe(222);
    await run(() => {
      delayed.resolve(snapshot(111));
    });
    expect(hook.current()).toMatchObject({
      ready: true,
      state: { coins: 222 },
    });
    expect(mocks.connectRepository).not.toHaveBeenCalled();
  });

  it("ignore la confirmation tardive d’une action après changement de compte", async () => {
    const delayed = deferred<CommandResponse>();
    const alice = cloud(snapshot(111));
    alice.execute.mockReturnValue(delayed.promise);
    mocks.transport
      .mockReturnValueOnce(alice)
      .mockReturnValueOnce(cloud(snapshot(222)));
    const hook = await mount({ userId: "alice" });
    let pending!: Promise<CommandResponse | null>;
    await run(() => {
      pending = hook.current().act({ type: "claim-visit" });
    });
    expect(hook.current().busy).toBe(true);
    await hook.render({ userId: "bob" });
    await run(() => {
      delayed.resolve(response(snapshot(333, 1)));
    });
    expect(await pending).toBeNull();
    expect(hook.current()).toMatchObject({
      ready: true,
      busy: false,
      state: { coins: 222 },
      notice: null,
    });
  });

  it.each(["snapshot", "failure"] as const)(
    "ignore le rechargement tardif d’un conflit du compte précédent (%s)",
    async (outcome) => {
      const delayed = deferred<GameSnapshot>();
      const alice = cloud(snapshot(111));
      alice.read
        .mockResolvedValueOnce(snapshot(111))
        .mockReturnValueOnce(delayed.promise);
      alice.execute.mockRejectedValue(new RemoteGameError("Conflit", 409));
      mocks.transport
        .mockReturnValueOnce(alice)
        .mockReturnValueOnce(cloud(snapshot(222)));
      const hook = await mount({ userId: "alice" });
      let pending!: Promise<CommandResponse | null>;
      await run(() => {
        pending = hook.current().act({ type: "claim-visit" });
      });
      expect(alice.read).toHaveBeenCalledTimes(2);
      await hook.render({ userId: "bob" });
      await run(() => {
        if (outcome === "snapshot") delayed.resolve(snapshot(333, 3));
        else delayed.reject(new RemoteGameError("Indisponible", 503));
      });
      expect(await pending).toBeNull();
      expect(hook.current()).toMatchObject({
        ready: true,
        busy: false,
        state: { coins: 222 },
        connectionError: null,
        notice: null,
      });
    },
  );

  it("n’autorise aucun refresh concurrent avant la fin de la première lecture serveur", async () => {
    const delayed = deferred<GameSnapshot>();
    const remote = cloud();
    remote.read.mockReturnValueOnce(delayed.promise);
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    await run(() => hook.current().refresh());
    await run(() => window.dispatchEvent(new Event("online")));
    expect(remote.read).toHaveBeenCalledTimes(1);
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();
    await run(() => {
      delayed.resolve(snapshot(100));
    });
    expect(hook.current().ready).toBe(true);
    expect(
      (
        await run(() =>
          hook.current().act({ type: "preferences", sound: false }),
        )
      )?.revision,
    ).toBe(1);
  });

  it("garde la partie affichée hors ligne et reprend uniquement après une lecture serveur", async () => {
    const remote = cloud(snapshot(321));
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    await run(() => window.dispatchEvent(new Event("offline")));
    expect(hook.current()).toMatchObject({
      ready: false,
      state: { coins: 321 },
    });
    expect(hook.current().connectionError).toContain("hors ligne");
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();
    expect(remote.execute).not.toHaveBeenCalled();
    remote.read.mockResolvedValueOnce(snapshot(654, 2));
    await run(() => window.dispatchEvent(new Event("online")));
    expect(hook.current()).toMatchObject({
      ready: true,
      state: { coins: 654 },
      connectionError: null,
    });
    expect(mocks.connectRepository).not.toHaveBeenCalled();
  });

  it("résout une réponse perdue avec le même identifiant sans gain local ni nouvelle commande", async () => {
    const remote = cloud(snapshot(100));
    const final = snapshot(160, 1);
    remote.execute.mockRejectedValueOnce(
      new RemoteGameError("Réponse perdue", 503),
    );
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();
    expect(hook.current()).toMatchObject({
      ready: false,
      state: { coins: 100 },
    });
    expect(hook.current().connectionError).toContain("confirmation");
    const request = remote.execute.mock.calls[0][0];
    expect(
      window.sessionStorage.getItem("brigo-cloud-pending:alice"),
    ).toContain(request.commandId);
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();
    remote.execute.mockResolvedValueOnce(response(final, true));
    remote.read.mockResolvedValueOnce(final);
    await run(() => hook.current().refresh());
    expect(remote.execute.mock.calls[1][0]).toEqual(request);
    expect(
      window.sessionStorage.getItem("brigo-cloud-pending:alice"),
    ).toBeNull();
    expect(hook.current()).toMatchObject({
      ready: true,
      state: { coins: 160 },
      connectionError: null,
    });
    expect(mocks.connectRepository).not.toHaveBeenCalled();
  });

  it("recharge le conflit d’un autre appareil sans réappliquer l’action refusée", async () => {
    const remote = cloud(snapshot(100));
    const latest = snapshot(250, 4);
    remote.execute.mockRejectedValueOnce(
      new RemoteGameError("Partie actualisée", 409, latest),
    );
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();
    expect(hook.current()).toMatchObject({
      ready: true,
      state: { coins: 250 },
    });
    expect(remote.execute).toHaveBeenCalledTimes(1);
    expect(
      window.sessionStorage.getItem("brigo-cloud-pending:alice"),
    ).toBeNull();
    remote.execute.mockResolvedValueOnce(response(snapshot(250, 5)));
    await run(() => hook.current().act({ type: "preferences", sound: false }));
    expect(remote.execute.mock.calls[1][0].expectedRevision).toBe(4);
  });

  it("ne bascule jamais vers la partie locale quand le cloud est indisponible", async () => {
    const remote = cloud(snapshot(999));
    remote.read.mockRejectedValueOnce(
      new RemoteGameError("Serveur indisponible", 503),
    );
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    expect(hook.current()).toMatchObject({
      ready: false,
      mode: "connected",
      connectionError: "Serveur indisponible",
    });
    expect(
      await run(() =>
        hook.current().localAct((state) => ({ ...state, coins: 123 })),
      ),
    ).toBe(false);
    expect(
      await run(() => hook.current().act({ type: "claim-visit" })),
    ).toBeNull();
    expect(mocks.connectRepository).not.toHaveBeenCalled();
    await run(() => hook.current().refresh());
    expect(hook.current()).toMatchObject({
      ready: true,
      state: { coins: 999 },
      connectionError: null,
    });
  });

  it("préserve le dernier état lors d’un échec de refresh et rétablit les actions après reprise", async () => {
    const remote = cloud(snapshot(321));
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    remote.read.mockRejectedValueOnce(
      new RemoteGameError("Connexion interrompue"),
    );
    await run(() => hook.current().refresh());
    expect(hook.current()).toMatchObject({
      ready: false,
      state: { coins: 321 },
      connectionError: "Connexion interrompue",
    });
    await run(() => hook.current().refresh());
    expect(hook.current()).toMatchObject({
      ready: true,
      state: { coins: 321 },
      connectionError: null,
    });
    expect(mocks.connectRepository).not.toHaveBeenCalled();
  });

  it("ignore un commit invité terminé après connexion et révoque les anciens callbacks locaux", async () => {
    const local = localRepository(777);
    const delayed = deferred<number>();
    vi.mocked(local.commit).mockReturnValueOnce(delayed.promise);
    mocks.connectRepository.mockResolvedValue(local);
    const hook = await mount();
    const retiredLocalAct = hook.current().localAct;
    let pending!: Promise<boolean>;
    await run(() => {
      pending = retiredLocalAct((state) => ({ ...state, coins: 888 }));
    });
    await hook.render({ userId: "alice" });
    await run(() => {
      delayed.resolve(1);
    });
    expect(await pending).toBe(false);
    expect(hook.current()).toMatchObject({
      ready: true,
      busy: false,
      state: { coins: 100 },
    });
    expect(
      await run(() => retiredLocalAct((state) => ({ ...state, coins: 999 }))),
    ).toBe(false);
    expect(local.commit).toHaveBeenCalledTimes(1);
  });

  it("utilise le temps serveur monotone et réveille les compteurs quand l’ancre est actualisée", async () => {
    let monotonic = 100;
    vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    const remote = cloud(snapshot(100));
    mocks.transport.mockReturnValue(remote);
    const hook = await mount({ userId: "alice" });
    const previousNow = hook.current().now;
    expect(previousNow()).toBe(Date.parse(serverTime));
    monotonic += 500;
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2037-01-01T00:00:00Z"));
    expect(hook.current().now()).toBe(Date.parse(serverTime) + 500);
    const nextTime = "2026-10-16T09:01:00.000Z";
    remote.read.mockResolvedValueOnce(snapshot(100, 0, nextTime));
    await run(() => hook.current().refresh());
    expect(hook.current().now).not.toBe(previousNow);
    expect(hook.current().now()).toBe(Date.parse(nextTime));
    monotonic += 1_000;
    expect(hook.current().now()).toBe(Date.parse(nextTime) + 1_000);
  });
});
