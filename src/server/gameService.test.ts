import { describe, expect, it } from "vitest";
import {
  createGameHandler,
  type GameRepository,
  type StoredGame,
} from "./gameService";
import { createGame } from "../game/engine";
import type { GameState } from "../game/engine";
import type { Snapshot } from "../game/commands";
import { createSandboxProject, placeSandboxBrigo } from "../game/sandbox";

const USER = "10000000-0000-4000-8000-000000000001";
const NOW = Date.parse("2026-10-16T10:00:00.000Z");
const ORIGIN = "https://brigo.example";
class MemoryRepository implements GameRepository {
  games = new Map<string, Snapshot>();
  receipts = new Map<
    string,
    { hash: string; result: Record<string, unknown> }
  >();
  commits = 0;
  loseNextResponse = false;
  async authenticate(token: string) {
    return token === "valid-user"
      ? USER
      : token === "second-user"
        ? "20000000-0000-4000-8000-000000000002"
        : null;
  }
  async load(
    userId: string,
    initialState: GameState,
    receipt?: { commandId: string; requestHash: string },
  ): Promise<StoredGame> {
    if (!this.games.has(userId))
      this.games.set(userId, {
        state: initialState,
        revision: 0,
        serverTime: new Date(NOW).toISOString(),
      });
    const game = structuredClone(this.games.get(userId)!);
    const previous =
      receipt && this.receipts.get(`${userId}/${receipt.commandId}`);
    return {
      ...game,
      status: previous
        ? previous.hash === receipt!.requestHash
          ? "replayed"
          : "command_id_reused"
        : "loaded",
      result: previous?.result,
    };
  }
  async commit(
    input: Parameters<GameRepository["commit"]>[0],
  ): Promise<StoredGame> {
    const game = this.games.get(input.userId)!;
    const key = `${input.userId}/${input.commandId}`;
    const receipt = this.receipts.get(key);
    if (receipt)
      return {
        ...structuredClone(game),
        status:
          receipt.hash === input.requestHash ? "replayed" : "command_id_reused",
        result: receipt.result,
      };
    if (game.revision !== input.expectedRevision)
      return { ...structuredClone(game), status: "revision_conflict" };
    this.commits++;
    const next = {
      state: structuredClone(input.state),
      revision: game.revision + 1,
      serverTime: new Date(NOW).toISOString(),
    };
    this.games.set(input.userId, next);
    this.receipts.set(key, { hash: input.requestHash, result: input.result });
    if (this.loseNextResponse) {
      this.loseNextResponse = false;
      throw new Error("connection lost after commit with private diagnostics");
    }
    return { ...next, status: "committed", result: input.result };
  }
}
function setup() {
  const repository = new MemoryRepository();
  const handler = createGameHandler({
    repository,
    allowedOrigins: [ORIGIN],
    now: () => NOW,
  });
  const get = (token = "valid-user") =>
    handler(
      new Request("https://api.example/game", {
        headers: { authorization: `Bearer ${token}`, origin: ORIGIN },
      }),
    );
  const post = (
    command: unknown,
    expectedRevision = 0,
    commandId: string = crypto.randomUUID(),
  ) =>
    handler(
      new Request("https://api.example/game", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-user",
          origin: ORIGIN,
          "content-type": "application/json",
        },
        body: JSON.stringify({ command, expectedRevision, commandId }),
      }),
    );
  return { repository, handler, get, post };
}

describe("authenticated server game boundary", () => {
  it("creates one new private game per verified account without importing client progress", async () => {
    const { get, repository } = setup();
    expect((await get("invalid")).status).toBe(401);
    const first = await (await get()).json();
    expect(first.state.coins).toBe(createGame().coins);
    expect(first.revision).toBe(0);
    await get();
    await get("second-user");
    expect(repository.games.size).toBe(2);
  });
  it("rejects unauthorized origins and fails closed when origins are unconfigured", async () => {
    const { handler, repository } = setup();
    const rejected = await handler(
      new Request("https://api.example/game", {
        headers: {
          origin: "https://evil.example",
          authorization: "Bearer valid-user",
        },
      }),
    );
    expect(rejected.status).toBe(403);
    expect(rejected.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(repository.games.size).toBe(0);
    const closed = createGameHandler({ repository, allowedOrigins: ["*"] });
    expect((await closed(new Request("https://api.example/game"))).status).toBe(
      503,
    );
  });
  it("handles preflight without requiring a bearer and disables response caching", async () => {
    const { handler, get } = setup();
    const response = await handler(
      new Request("https://api.example/game", {
        method: "OPTIONS",
        headers: { origin: ORIGIN },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect((await get()).headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([
    { type: "admin-coins", coins: 999999 },
    { type: "open-box", boxId: "discovery", drops: [], nowMs: NOW + 999999 },
    { type: "import", state: createGame() },
  ])("rejects forged command %j before loading the game", async (command) => {
    const { post, repository } = setup();
    expect((await post(command)).status).toBe(400);
    expect(repository.games.size).toBe(0);
  });
  it("bounds streamed payloads and rejects extra envelope fields", async () => {
    const { handler } = setup();
    const headers = {
      authorization: "Bearer valid-user",
      origin: ORIGIN,
      "content-type": "application/json",
    };
    const oversized = await handler(
      new Request("https://api.example/game", {
        method: "POST",
        headers,
        body: JSON.stringify({ value: "x".repeat(17_000) }),
      }),
    );
    expect(oversized.status).toBe(413);
    const forged = await handler(
      new Request("https://api.example/game", {
        method: "POST",
        headers,
        body: JSON.stringify({
          commandId: crypto.randomUUID(),
          expectedRevision: 0,
          command: { type: "claim-visit" },
          userId: USER,
        }),
      }),
    );
    expect(forged.status).toBe(400);
  });
  it("uses server time and preserves a completed random draw across retries", async () => {
    const { get, post, repository } = setup();
    await get();
    const id = crypto.randomUUID();
    const first = await (
      await post({ type: "open-box", boxId: "discovery" }, 0, id)
    ).json();
    expect(first.state.pendingOpening.createdAt).toBe(
      new Date(NOW).toISOString(),
    );
    const repeated = await (
      await post({ type: "open-box", boxId: "discovery" }, 0, id)
    ).json();
    expect(repeated.replayed).toBe(true);
    expect(repeated.state.pendingOpening).toEqual(first.state.pendingOpening);
    expect(repository.commits).toBe(1);
  });
  it("replays the original result together with the CURRENT snapshot", async () => {
    const { post } = setup();
    const id = crypto.randomUUID();
    const first = await (
      await post({ type: "create-project", name: "Mon projet" }, 0, id)
    ).json();
    await post({ type: "preferences", sound: true }, 1);
    const repeated = await (
      await post({ name: "Mon projet", type: "create-project" }, 0, id)
    ).json();
    expect(repeated.result).toEqual(first.result);
    expect(repeated.state.sandboxProjects).toHaveLength(1);
    expect(repeated.state.preferences.sound).toBe(true);
    expect(repeated.revision).toBe(2);
    expect(
      (await post({ type: "create-project", name: "Autre" }, 0, id)).status,
    ).toBe(409);
  });
  it("persists a private exhibition once, replays its receipt and rejects another user's project", async () => {
    const { post, repository } = setup();
    const brigoId = "brick-1x1:coral";
    let state = createSandboxProject(
      { ...createGame(), inventory: { [brigoId]: 1 }, discovered: [brigoId] },
      "Mon jardin",
      NOW,
    );
    const projectId = state.sandboxProjects![0].id;
    state = placeSandboxBrigo(
      state,
      projectId,
      { brigoId, x: 1, y: 1, z: 0, rotation: 0 },
      NOW,
    );
    repository.games.set(USER, {
      state,
      revision: 0,
      serverTime: new Date(NOW).toISOString(),
    });
    const command = {
      type: "expose-project",
      projectId,
      name: "Jardin corail",
      description: "Personnel",
      rotation: 90,
      backgroundId: "ink",
    };
    const commandId = crypto.randomUUID();
    const first = await post(command, 0, commandId);
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.state.freeGallery.exhibits).toHaveLength(1);
    expect(body.state.inventory).toEqual(state.inventory);
    expect(body.state.coins).toBe(state.coins);
    const repeated = await (await post(command, 0, commandId)).json();
    expect(repeated.replayed).toBe(true);
    expect(repository.commits).toBe(1);
    expect(
      (await post({ ...command, projectId: "other-user-project" }, 1)).status,
    ).toBe(422);
    expect(repository.commits).toBe(1);
    expect((await post({ ...command, coins: 999 }, 1)).status).toBe(400);
  });
  it("never spends twice when requests compete at the same revision", async () => {
    const { get, post, repository } = setup();
    await get();
    const responses = await Promise.all([
      post({ type: "open-box", boxId: "discovery" }),
      post({ type: "open-box", boxId: "discovery" }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(repository.games.get(USER)!.state.boxes.discovery).toBe(2);
    expect(repository.commits).toBe(1);
    const conflict = await responses
      .find((response) => response.status === 409)!
      .json();
    expect(conflict.error.code).toBe("REVISION_CONFLICT");
    expect(conflict.snapshot.revision).toBe(1);
  });
  it("recovers a response lost after the atomic commit without crediting twice", async () => {
    const { post, repository } = setup();
    repository.loseNextResponse = true;
    const id = crypto.randomUUID();
    const failed = await post({ type: "claim-visit" }, 0, id);
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private diagnostics");
    const repeated = await (await post({ type: "claim-visit" }, 0, id)).json();
    expect(repeated.replayed).toBe(true);
    expect(repository.commits).toBe(1);
  });
  it("persists old server save migrations once before exposing the snapshot", async () => {
    const { get, repository } = setup();
    const old = {
      ...createGame(),
      version: 6,
      engagement: undefined,
      sandboxProjects: undefined,
      production: undefined,
    } as GameState;
    repository.games.set(USER, {
      state: old,
      revision: 7,
      serverTime: new Date(NOW).toISOString(),
    });
    const migrated = await (await get()).json();
    expect(migrated.state.version).toBe(createGame().version);
    expect(migrated.revision).toBe(8);
    expect(migrated.state.coins).toBe(old.coins);
    await get();
    expect(repository.commits).toBe(1);
  });
  it.each([false, true])(
    "persists a migration before replying to a known receipt (changed command: %s)",
    async (changed) => {
      const { post, repository } = setup();
      const id = crypto.randomUUID();
      const original = await (
        await post({ type: "create-project", name: "Mon projet" }, 0, id)
      ).json();
      const previous = repository.games.get(USER)!;
      repository.games.set(USER, {
        ...previous,
        state: { ...previous.state, version: 9 },
      });
      const response = await post(
        { type: "create-project", name: changed ? "Autre" : "Mon projet" },
        0,
        id,
      );
      const body = await response.json();
      expect(response.status).toBe(changed ? 409 : 200);
      const current = changed ? body.snapshot : body;
      expect(current.state.version).toBe(createGame().version);
      expect(current.revision).toBe(2);
      expect(repository.games.get(USER)!.state.version).toBe(
        createGame().version,
      );
      expect(current.state.sandboxProjects).toHaveLength(1);
      if (changed) expect(body.error.code).toBe("COMMAND_ID_REUSED");
      else {
        expect(body.replayed).toBe(true);
        expect(body.result).toEqual(original.result);
      }
      await post({ type: "create-project", name: "Mon projet" }, 0, id);
      expect(repository.commits).toBe(2);
    },
  );
});
