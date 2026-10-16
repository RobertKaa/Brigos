import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
  MAX_VALUE,
  reservedCount,
} from "./engine";
import type { GameState } from "./engine";
import {
  collectProduction,
  getProduction,
  PRODUCTION_CYCLE_MS,
} from "./production";
import { playerProgress } from "./progression";
import { importSave, parseSave } from "./save";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { connectRepository, SaveConflict } from "./storage";
import type { Repository } from "./storage";

const START = Date.parse("2026-10-19T12:00:00.000Z");

function builtTotem(): GameState {
  return buildRecipe(
    adminCommand(createGame(), { type: "recipe", recipeId: "totem" }, true),
    "totem",
  );
}

describe("persistance et conservation de la production", () => {
  const connections: Repository[] = [];
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(START);
  });
  afterEach(() => {
    connections.splice(0).forEach((connection) => connection.close());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const connect = async () => {
    const connection = await connectRepository();
    connections.push(connection);
    return connection;
  };

  it("réimporte les marqueurs reçus sans rejouer un lot déjà crédité", () => {
    const original = builtTotem();
    const readyAt = START + PRODUCTION_CYCLE_MS;
    vi.setSystemTime(readyAt);
    const expected = getProduction(original, readyAt).totalReady;
    expect(expected).toBeGreaterThan(0);
    const received = collectProduction(original, undefined, readyAt);
    const imported = importSave(JSON.stringify(received));
    expect(imported).toEqual(received);
    expect(getProduction(imported, readyAt).totalReady).toBe(0);
    expect(collectProduction(imported, undefined, readyAt)).toEqual(received);
    expect(imported.inventory).toEqual(original.inventory);
    expect(imported.discovered).toEqual(original.discovered);
    expect(reservedCount(imported)).toBe(reservedCount(original));
    expect(playerProgress(imported)).toEqual(playerProgress(original));
    expect(imported.coins - original.coins).toBe(expected);

    const nextAt = readyAt + PRODUCTION_CYCLE_MS;
    const next = collectProduction(imported, undefined, nextAt);
    expect(next.coins - imported.coins).toBe(expected);
    expect(next.inventory).toEqual(original.inventory);
    expect(getProduction(next, nextAt).totalReady).toBe(0);
  });

  it("ne crédite qu’une récolte lorsque deux onglets enregistrent le même lot", async () => {
    const first = await connect();
    const second = await connect();
    const built = builtTotem();
    await first.commit(built, 0);
    const readyAt = START + PRODUCTION_CYCLE_MS;
    vi.setSystemTime(readyAt);
    const a = await first.load();
    const b = await second.load();
    const expected = getProduction(a.state, readyAt).totalReady;
    const results = await Promise.allSettled([
      first.commit(collectProduction(a.state, undefined, readyAt), a.revision),
      second.commit(collectProduction(b.state, undefined, readyAt), b.revision),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected");
    expect(failure?.status === "rejected" && failure.reason).toBeInstanceOf(
      SaveConflict,
    );
    const final = await second.load();
    expect(final.revision).toBe(2);
    expect(final.state.coins - built.coins).toBe(expected);
    expect(final.state.inventory).toEqual(built.inventory);
    expect(final.state.discovered).toEqual(built.discovered);
    expect(getProduction(final.state, readyAt).totalReady).toBe(0);
    expect(final.state.constructions).toEqual(built.constructions);
  });

  it("persiste une migration v8 une seule fois et démarre les anciens modèles sans rétroactivité", async () => {
    const built = builtTotem();
    const { production: _notYetAvailable, ...oldFields } = built;
    const legacy = {
      ...oldFields,
      version: 8,
      constructions: built.constructions.map((construction) => ({
        ...construction,
        createdAt: "2020-01-01T00:00:00.000Z",
      })),
    };
    const database = await openDB("brigo-club", 1, {
      upgrade(db) {
        db.createObjectStore("saves");
      },
    });
    await database.put("saves", { revision: 5, state: legacy }, "player");
    database.close();
    const first = await connect();
    const second = await connect();
    const [a, b] = await Promise.all([first.load(), second.load()]);
    expect(a).toEqual(b);
    expect(a.revision).toBe(6);
    expect(a.state.version).toBe(CURRENT_SAVE_VERSION);
    expect(a.state.inventory).toEqual(legacy.inventory);
    expect(a.state.constructions).toEqual(legacy.constructions);
    expect(a.state.engagement).toEqual(legacy.engagement);
    expect(getProduction(a.state, START).totalReady).toBe(0);
    const constructionId = a.state.constructions[0].id;
    expect(a.state.production!.entries[constructionId].anchorAt).toBe(START);

    vi.setSystemTime(START + PRODUCTION_CYCLE_MS);
    const reloaded = await second.load();
    expect(reloaded.revision).toBe(6);
    expect(reloaded.state.production).toEqual(a.state.production);
    expect(getProduction(reloaded.state).totalReady).toBeGreaterThan(0);
  });

  it("laisse intacte une récolte qui dépasserait la réserve de pièces de monnaie", () => {
    const built = builtTotem();
    const readyAt = START + PRODUCTION_CYCLE_MS;
    const full = {
      ...built,
      coins: MAX_VALUE,
    };
    const snapshot = JSON.stringify(full);
    expect(() => collectProduction(full, undefined, readyAt)).toThrow("plein");
    expect(JSON.stringify(full)).toBe(snapshot);
    expect(getProduction(full, readyAt).capacityBlocked).toBe(true);
    expect(getProduction(full, readyAt).totalReady).toBeGreaterThan(0);
  });

  it("migre une seule fois les coins mûrs v9 et ne les rejoue pas après une récolte v10", async () => {
    const built = builtTotem();
    const id = built.constructions[0].id;
    const legacy = {
      ...built,
      version: 9,
      production: {
        observedAt: START,
        entries: { [id]: { anchorAt: START, claimedCycles: 0 } },
      },
    };
    const database = await openDB("brigo-club", 1, {
      upgrade(db) {
        db.createObjectStore("saves");
      },
    });
    await database.put("saves", { revision: 5, state: legacy }, "player");
    const now = START + PRODUCTION_CYCLE_MS * 1.5;
    vi.setSystemTime(now);
    const first = await connect();
    const second = await connect();
    const [a, b] = await Promise.all([first.load(), second.load()]);
    expect(a).toEqual(b);
    expect(a.revision).toBe(6);
    expect(a.state.version).toBe(10);
    expect(a.state.coins).toBe(legacy.coins);
    expect(getProduction(a.state).totalReady).toBe(2);
    expect(a.state.production!.entries[id].bankedCoins).toBe(2);
    expect((await database.get("saves", "player")).state).toEqual(a.state);
    expect(await second.load()).toEqual(a);
    const received = collectProduction(a.state, undefined, now);
    expect(received.coins - a.state.coins).toBe(2);
    expect(await first.commit(received, a.revision)).toBe(7);
    await expect(
      second.commit(collectProduction(b.state, undefined, now), b.revision),
    ).rejects.toBeInstanceOf(SaveConflict);
    const reloaded = await second.load();
    expect(reloaded.revision).toBe(7);
    expect(getProduction(reloaded.state).totalReady).toBe(0);

    const next = getProduction(reloaded.state).nextReadyAt!;
    expect(next - now).toBe(30 * 60_000);
    vi.setSystemTime(next);
    const matured = await first.load();
    expect(matured.revision).toBe(7);
    expect(matured.state.production).toEqual(received.production);
    expect(getProduction(matured.state).totalReady).toBe(1);
    database.close();
  });

  it("persiste une seule initialisation v10 manquante sans repousser ses cycles aux rechargements", async () => {
    const firstBuilt = builtTotem();
    const two = buildRecipe(
      adminCommand(firstBuilt, { type: "recipe", recipeId: "totem" }, true),
      "totem",
    );
    const [existing, missing] = two.constructions;
    const collected = collectProduction(
      two,
      existing.id,
      START + PRODUCTION_CYCLE_MS,
    );
    const initializedAt = START + PRODUCTION_CYCLE_MS * 2;
    const partial: GameState = {
      ...collected,
      production: {
        // Equal timestamps exercise missing-entry detection independently.
        observedAt: initializedAt,
        entries: { [existing.id]: collected.production!.entries[existing.id] },
      },
    };
    const database = await openDB("brigo-club", 1, {
      upgrade(db) {
        db.createObjectStore("saves");
      },
    });
    await database.put("saves", { revision: 5, state: partial }, "player");
    vi.setSystemTime(initializedAt);
    const first = await connect();
    const second = await connect();
    const [a, b] = await Promise.all([first.load(), second.load()]);
    expect(a).toEqual(b);
    expect(a.revision).toBe(6);
    expect(a.state.production!.entries[existing.id]).toEqual(
      partial.production!.entries[existing.id],
    );
    expect(a.state.production!.entries[missing.id]).toEqual({
      anchorAt: initializedAt,
      claimedCycles: 0,
      bankedCoins: 0,
    });
    expect((await database.get("saves", "player")).state).toEqual(a.state);
    expect(a.state.coins).toBe(partial.coins);
    expect(
      getProduction(a.state).rows.find(
        (row) => row.constructionId === missing.id,
      )!.ready,
    ).toBe(0);
    await expect(first.commit(partial, 5)).rejects.toBeInstanceOf(SaveConflict);

    vi.setSystemTime(initializedAt + PRODUCTION_CYCLE_MS);
    const reloaded = await second.load();
    expect(reloaded.revision).toBe(6);
    expect(reloaded.state.production).toEqual(a.state.production);
    expect(
      getProduction(reloaded.state).rows.find(
        (row) => row.constructionId === missing.id,
      )!.ready,
    ).toBeGreaterThan(0);
    expect(await first.load()).toEqual(reloaded);
    expect((await database.get("saves", "player")).revision).toBe(6);
    database.close();
  });

  it("ne verse pas un premier doublon quand le cumul des récoltes dépasse le plafond", () => {
    const first = builtTotem();
    const two = buildRecipe(
      adminCommand(first, { type: "recipe", recipeId: "totem" }, true),
      "totem",
    );
    const readyAt = START + PRODUCTION_CYCLE_MS;
    const each = getProduction(two, readyAt).rows[0].ready;
    const almostFull = { ...two, coins: MAX_VALUE - each };
    const summary = getProduction(almostFull, readyAt);
    expect(summary.rows.every((row) => !row.capacityBlocked)).toBe(true);
    expect(summary.capacityBlocked).toBe(true);
    const snapshot = JSON.stringify(almostFull);
    expect(() => collectProduction(almostFull, undefined, readyAt)).toThrow(
      "plein",
    );
    expect(JSON.stringify(almostFull)).toBe(snapshot);

    const single = collectProduction(
      almostFull,
      two.constructions[0].id,
      readyAt,
    );
    expect(single.coins).toBe(MAX_VALUE);
    expect(getProduction(single, readyAt).rows.map((row) => row.ready)).toEqual(
      [0, each],
    );
    expect(single.inventory).toEqual(two.inventory);
  });

  it("annule ensemble récolte et démontage si le retour des matériaux dépasserait le plafond", () => {
    const built = builtTotem();
    const readyAt = START + PRODUCTION_CYCLE_MS;
    vi.setSystemTime(readyAt);
    const construction = built.constructions[0];
    const reservedId = Object.keys(construction.pieces)[0];
    const filled = {
      ...built,
      inventory: {
        ...built.inventory,
        [reservedId]: MAX_VALUE - construction.pieces[reservedId] + 1,
      },
    };
    const snapshot = JSON.stringify(filled);
    expect(() => dismantle(filled, construction.id)).toThrow("plein");
    expect(JSON.stringify(filled)).toBe(snapshot);
    expect(filled.constructions).toHaveLength(1);
    expect(getProduction(filled, readyAt).totalReady).toBeGreaterThan(0);
    expect(parseSave(filled)).toEqual(filled);
  });
});
