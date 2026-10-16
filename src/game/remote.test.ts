import { describe, expect, it, vi } from "vitest";
import {
  ConnectedRepository,
  RemoteGameError,
  parseSnapshot,
  supabaseGameTransport,
} from "./remote";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameTransport } from "./remote";
import { createGame } from "./engine";
import { applyGameCommand } from "./commands";
import type { CommandRequest, CommandResponse } from "./commands";

const time = "2026-10-16T09:00:00.000Z";
function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
function service() {
  let state = createGame();
  let revision = 1;
  const receipts = new Map<string, CommandResponse>();
  const execute = vi.fn(async (request: CommandRequest) => {
    const existing = receipts.get(request.commandId);
    if (existing) return { ...existing, state, revision, replayed: true };
    if (revision !== request.expectedRevision)
      throw new RemoteGameError("Conflit", 409);
    const applied = applyGameCommand(state, request.command, Date.parse(time));
    state = applied.state;
    revision++;
    const response = {
      state,
      revision,
      serverTime: time,
      result: applied.result,
      replayed: false,
    };
    receipts.set(request.commandId, response);
    return response;
  });
  return {
    read: async () => ({ state, revision, serverTime: time }),
    execute,
  } satisfies GameTransport;
}

describe("partie connectée et confirmations perdues", () => {
  it("lie la requête au compte de départ et capture explicitement son jeton", async () => {
    const invoke = vi.fn(async () => ({
      data: { accepted: true },
      error: null,
    }));
    const client = {
      auth: {
        getSession: vi.fn(async () => ({
          data: {
            session: {
              user: { id: "alice" },
              access_token: "alice-test-token",
            },
          },
          error: null,
        })),
      },
      functions: { invoke },
    } as unknown as SupabaseClient;
    await supabaseGameTransport(client, "alice").execute({
      commandId: crypto.randomUUID(),
      expectedRevision: 0,
      command: { type: "claim-visit" },
    });
    expect(invoke).toHaveBeenCalledWith(
      "game",
      expect.objectContaining({
        headers: { Authorization: "Bearer alice-test-token" },
      }),
    );
    await expect(
      supabaseGameTransport(client, "bob").read(),
    ).rejects.toMatchObject({ status: 401 });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("rejoue le même identifiant après une réponse perdue sans nouveau tirage", async () => {
    const server = service();
    const transport = {
      ...server,
      execute: vi.fn(async (request: CommandRequest) => {
        const response = await server.execute(request);
        if (transport.execute.mock.calls.length === 1)
          throw new RemoteGameError("Réseau");
        return response;
      }),
    };
    const repository = new ConnectedRepository(
      transport,
      "alice",
      memoryStorage(),
    );
    const response = await repository.execute(
      { type: "open-box", boxId: "discovery" },
      1,
    );
    expect(response.replayed).toBe(true);
    expect(response.state.boxesOpened).toBe(1);
    expect(response.state.boxes.discovery).toBe(2);
    expect(server.execute.mock.calls[0][0]).toEqual(
      server.execute.mock.calls[1][0],
    );
    expect(repository.hasPending()).toBe(false);
  });

  it("résout une commande conservée après rechargement avant d'autoriser une nouvelle action", async () => {
    const storage = memoryStorage();
    const server = service();
    const interrupted: GameTransport = {
      ...server,
      execute: async (request) => {
        await server.execute(request);
        throw new RemoteGameError("Réponse perdue", 503);
      },
    };
    const first = new ConnectedRepository(interrupted, "alice", storage);
    await expect(
      first.execute({ type: "open-box", boxId: "discovery" }, 1),
    ).rejects.toThrow();
    expect(first.hasPending()).toBe(true);
    await expect(
      first.execute({ type: "open-box", boxId: "discovery" }, 1),
    ).rejects.toThrow("confirmation");
    const restored = new ConnectedRepository(server, "alice", storage);
    const snapshot = await restored.load();
    expect(snapshot.state.boxesOpened).toBe(1);
    expect(restored.hasPending()).toBe(false);
  });

  it("ne perd pas l'identifiant en cas d'expiration de session suivant une réponse perdue", async () => {
    const storage = memoryStorage();
    const server = service();
    const repository = new ConnectedRepository(
      {
        ...server,
        execute: async (request) => {
          await server.execute(request);
          throw new RemoteGameError("Session expirée", 401);
        },
      },
      "alice",
      storage,
    );
    await expect(
      repository.execute({ type: "open-box", boxId: "discovery" }, 1),
    ).rejects.toThrow();
    const restored = new ConnectedRepository(server, "alice", storage);
    expect((await restored.load()).state.boxesOpened).toBe(1);
  });

  it("isole les commandes en attente entre deux comptes", async () => {
    const storage = memoryStorage();
    const server = service();
    const unavailable: GameTransport = {
      ...server,
      execute: async () => {
        throw new RemoteGameError("Indisponible", 503);
      },
    };
    await expect(
      new ConnectedRepository(unavailable, "alice", storage).execute(
        { type: "claim-visit" },
        1,
      ),
    ).rejects.toThrow();
    expect(new ConnectedRepository(server, "bob", storage).hasPending()).toBe(
      false,
    );
    expect(new ConnectedRepository(server, "alice", storage).hasPending()).toBe(
      true,
    );
  });

  it("réactualise un conflit définitif sans garder une commande bloquante", async () => {
    const server = service();
    await server.execute({
      commandId: crypto.randomUUID(),
      expectedRevision: 1,
      command: { type: "claim-visit" },
    });
    const repository = new ConnectedRepository(
      server,
      "alice",
      memoryStorage(),
    );
    await expect(
      repository.execute({ type: "open-box", boxId: "discovery" }, 1),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.hasPending()).toBe(false);
    expect((await repository.load()).revision).toBe(2);
  });

  it("n'envoie rien si le navigateur ne peut pas retenir l'identifiant de commande", async () => {
    const server = service();
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error("Stockage indisponible");
      },
    };
    const repository = new ConnectedRepository(server, "alice", storage);
    await expect(
      repository.execute({ type: "claim-visit" }, 1),
    ).rejects.toThrow();
    expect(server.execute).not.toHaveBeenCalled();
  });

  it("valide les réponses avec l'heure serveur sans utiliser l'horloge locale", () => {
    expect(
      parseSnapshot({ state: createGame(), revision: 1, serverTime: time })
        .serverTime,
    ).toBe(time);
    expect(() =>
      parseSnapshot({ state: createGame(), revision: -1, serverTime: time }),
    ).toThrow();
    expect(() =>
      parseSnapshot({
        state: createGame(),
        revision: 1,
        serverTime: "invalide",
      }),
    ).toThrow();
  });
});
