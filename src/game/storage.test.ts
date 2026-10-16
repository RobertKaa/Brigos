import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDB } from "idb";
import { createGame, finishOpening, openBox, openNextBox } from "./engine";
import { RECIPE_BY_ID } from "./catalog";
import { connectRepository, SaveConflict } from "./storage";
import type { Repository } from "./storage";

const legacyGame = () => {
  const { production: _futureProduction, ...legacy } = createGame();
  return legacy;
};

describe("persistance IndexedDB", () => {
  const connections: Repository[] = [];
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  afterEach(() => {
    connections.splice(0).forEach((connection) => connection.close());
  });
  const connect = async () => {
    const connection = await connectRepository();
    connections.push(connection);
    return connection;
  };
  it("recharge la progression et l’ouverture en cours à partir d’une nouvelle connexion", async () => {
    const first = await connect();
    expect((await first.load()).revision).toBe(0);
    const state = openBox(createGame(), "discovery", { random: () => 0 });
    expect(await first.commit(state, 0)).toBe(1);
    const second = await connect();
    expect(await second.load()).toEqual({ state, revision: 1 });
  });
  it("refuse une écriture obsolète sans écraser la partie d’un autre onglet", async () => {
    const first = await connect();
    const second = await connect();
    const state = { ...createGame(), coins: 2500 };
    await first.commit(state, 0);
    await expect(
      second.commit({ ...createGame(), coins: 7 }, 0),
    ).rejects.toBeInstanceOf(SaveConflict);
    expect((await first.load()).state.coins).toBe(2500);
  });
  it("recharge cinq anciennes cartes sans migration, puis ne crédite qu’une boîte de dix malgré deux onglets", async () => {
    const first = await connect();
    const second = await connect();
    const brigoId = "brick-1x1:coral";
    const opening = {
      id: "legacy-five",
      boxId: "discovery" as const,
      createdAt: "2026-10-08T08:00:00.000Z",
      drops: Array.from({ length: 5 }, (_, index) => ({
        brigoId,
        isNew: index === 0,
      })),
    };
    const source = {
      ...createGame(),
      inventory: { [brigoId]: 5 },
      discovered: [brigoId],
      boxes: { discovery: 2, workshop: 0, prism: 0 },
      boxesOpened: 1,
      history: [opening],
      pendingOpening: opening,
    };
    await first.commit(source, 0);
    const original = await second.load();
    expect(original).toEqual({ state: source, revision: 1 });
    const results = await Promise.allSettled([
      first.commit(
        openNextBox(original.state, "discovery", { random: () => 0 }),
        original.revision,
      ),
      second.commit(
        openNextBox(original.state, "discovery", { random: () => 0 }),
        original.revision,
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const final = await first.load();
    expect(final.revision).toBe(2);
    expect(final.state.history.map((item) => item.drops.length)).toEqual([
      10, 5,
    ]);
    expect(final.state.pendingOpening?.drops).toHaveLength(10);
    expect(final.state.inventory).toEqual({ [brigoId]: 15 });
    expect(final.state.boxes.discovery).toBe(1);
    expect(final.state.coins).toBe(1200);
    expect(final.state.boxesOpened).toBe(2);
    expect(await second.load()).toEqual(final);
  });
  it("sérialise deux actions concurrentes et permet de réessayer sur la bonne révision", async () => {
    const first = await connect();
    const second = await connect();
    const results = await Promise.allSettled([
      first.commit({ ...createGame(), coins: 1300 }, 0),
      second.commit({ ...createGame(), coins: 1400 }, 0),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const latest = await second.load();
    await second.commit(
      finishOpening(openBox(latest.state, "discovery", { random: () => 0 })),
      latest.revision,
    );
    const final = await first.load();
    expect(final.revision).toBe(2);
    expect(final.state.boxesOpened).toBe(1);
    expect(final.state.coins).toBe(latest.state.coins);
  });
  it("signale une sauvegarde corrompue sans la remplacer silencieusement", async () => {
    const first = await connect();
    const db = await openDB("brigo-club", 1);
    await db.put(
      "saves",
      { revision: 1, state: { version: 999, important: "original" } },
      "player",
    );
    await expect(first.load()).rejects.toThrow("version");
    expect((await db.get("saves", "player")).state.important).toBe("original");
    db.close();
  });
  it("migre puis persiste une ancienne construction sans dupliquer les pièces", async () => {
    const first = await connect();
    const db = await openDB("brigo-club", 1);
    const pieces = {
      "brick-1x1:orange": 1,
      "slope-2x2:mint": 3,
      "plate-2x2:mint": 1,
    };
    await db.put(
      "saves",
      {
        revision: 4,
        state: {
          ...legacyGame(),
          version: 1,
          inventory: {},
          discovered: Object.keys(pieces),
          constructions: [
            {
              id: "legacy-tree",
              recipeId: "tree",
              createdAt: new Date().toISOString(),
              pieces,
            },
          ],
        },
      },
      "player",
    );
    const migrated = await first.load();
    expect(migrated.migratedConstructions).toBe(1);
    expect(migrated.state.inventory).toEqual(pieces);
    expect(migrated.revision).toBe(5);
    expect((await db.get("saves", "player")).state).toEqual(migrated.state);
    expect((await first.load()).migratedConstructions).toBeUndefined();
    await first.commit(migrated.state, migrated.revision);
    const again = await first.load();
    expect(again.revision).toBe(6);
    expect(again.state.inventory).toEqual(pieces);
    expect(again.state.constructions).toEqual([]);
    expect(again.migratedConstructions).toBeUndefined();
    db.close();
  });

  it("sérialise deux migrations v3 et ne rembourse qu’une fois", async () => {
    const first = await connect();
    const second = await connect();
    const db = await openDB("brigo-club", 1);
    const source = {
      ...legacyGame(),
      version: 3,
      inventory: { "brick-2x2:coral": 2 },
      discovered: ["brick-2x2:coral"],
      goalRecipeId: "totem",
      constructions: [
        {
          id: "old-totem",
          recipeId: "totem",
          createdAt: "2026-10-08T11:00:00.000Z",
          pieces: { "brick-2x2:coral": 5 },
        },
      ],
      claimedAchievements: ["first-expert"],
      lastVisitRewardAt: "2026-10-08T12:00:00.000Z",
    };
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      await db.put("saves", { revision: 4, state: source }, "player");
      const loads = await Promise.all([first.load(), second.load()]);
      expect(loads.filter((result) => result.migration)).toHaveLength(1);
      for (const loaded of loads) {
        expect(loaded.revision).toBe(5);
        expect(loaded.state.version).toBe(CURRENT_SAVE_VERSION);
        expect(loaded.state.inventory).toEqual({ "brick-2x2:coral": 7 });
        expect(loaded.state.constructions).toEqual([]);
        expect(loaded.state.goalRecipeId).toBeNull();
        expect(loaded.state.claimedAchievements).toEqual(
          source.claimedAchievements,
        );
        expect(loaded.state.lastVisitRewardAt).toBe(source.lastVisitRewardAt);
      }
      expect((await first.load()).migration).toBeUndefined();
      expect((await db.get("saves", "player")).state.inventory).toEqual({
        "brick-2x2:coral": 7,
      });
      await expect(first.commit(createGame(), 4)).rejects.toBeInstanceOf(
        SaveConflict,
      );
      expect((await second.load()).state.inventory).toEqual({
        "brick-2x2:coral": 7,
      });
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
      db.close();
    }
  });

  it("persiste une v3 intacte sans perdre les récompenses ni rejouer une migration", async () => {
    const connection = await connect();
    const db = await openDB("brigo-club", 1);
    const { production: _futureProduction, ...opened } = openBox(
      createGame(),
      "discovery",
      { random: () => 0 },
    );
    const source = {
      ...opened,
      version: 3,
      claimedAchievements: ["builder-variety"],
      lastVisitRewardAt: "2026-10-08T12:00:00.000Z",
    };
    await db.put("saves", { revision: 8, state: source }, "player");
    const migrated = await connection.load();
    expect(migrated.revision).toBe(9);
    expect(migrated.migration).toBeUndefined();
    expect(migrated.state).toEqual({
      ...source,
      version: CURRENT_SAVE_VERSION,
      production: { observedAt: expect.any(Number), entries: {} },
    });
    expect(await connection.load()).toEqual(migrated);
    expect((await db.get("saves", "player")).state).toEqual(migrated.state);
    db.close();
  });

  it("persiste une seule fois le marqueur d’une v4 de développement compatible", async () => {
    const connection = await connect();
    const db = await openDB("brigo-club", 1);
    const {
      planRevision: _unused,
      production: _futureProduction,
      ...legacy
    } = createGame();
    const source = { ...legacy, version: 4 };
    await db.put("saves", { revision: 5, state: source }, "player");
    const migrated = await connection.load();
    expect(migrated).toEqual({
      revision: 6,
      state: {
        ...createGame(),
        production: { observedAt: expect.any(Number), entries: {} },
      },
    });
    expect((await db.get("saves", "player")).state.planRevision).toBe(1);
    expect(await connection.load()).toEqual(migrated);
    db.close();
  });

  it("conserve la v3 d’origine si une restitution dépasse la limite", async () => {
    const connection = await connect();
    const db = await openDB("brigo-club", 1);
    const source = {
      ...legacyGame(),
      version: 3,
      inventory: { "brick-2x2:coral": 10_000_000 },
      discovered: ["brick-2x2:coral"],
      constructions: [
        {
          id: "old-totem",
          recipeId: "totem",
          createdAt: "2026-10-08T11:00:00.000Z",
          pieces: { "brick-2x2:coral": 5 },
        },
      ],
    };
    const current = RECIPE_BY_ID.get("totem");
    RECIPE_BY_ID.delete("totem");
    try {
      await db.put("saves", { revision: 3, state: source }, "player");
      await expect(connection.load()).rejects.toThrow("limite d’inventaire");
      expect(await db.get("saves", "player")).toEqual({
        revision: 3,
        state: source,
      });
    } finally {
      if (current) RECIPE_BY_ID.set("totem", current);
      db.close();
    }
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    "refuse une révision d’écriture invalide sans créer une sauvegarde (%s)",
    async (revision) => {
      const connection = await connect();
      await expect(connection.commit(createGame(), revision)).rejects.toThrow(
        "Révision",
      );
      expect(await connection.load()).toEqual({
        revision: 0,
        state: createGame(),
      });
    },
  );

  it("préserve la source si la migration ferait déborder sa révision", async () => {
    const connection = await connect();
    const db = await openDB("brigo-club", 1);
    const source = { ...legacyGame(), version: 3 };
    await db.put(
      "saves",
      { revision: Number.MAX_SAFE_INTEGER, state: source },
      "player",
    );
    await expect(connection.load()).rejects.toThrow("Révision");
    expect(await db.get("saves", "player")).toEqual({
      revision: Number.MAX_SAFE_INTEGER,
      state: source,
    });
    db.close();
  });
});
