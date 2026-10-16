import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { describe, expect, it, vi } from "vitest";
import { RECIPE_BY_ID } from "./catalog";
import { buildRecipe, createGame } from "./engine";
import type { GameState } from "./engine";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";
import { connectRepository } from "./storage";
import { applyCurrentReleaseAction, isCurrentReleaseState } from "./useGame";

describe("garde de version pour les états React retenus pendant Fast Refresh", () => {
  it("refuse d’utiliser de nouveaux plans avec un état retenu d’une autre version", () => {
    const retained = {
      ...createGame(),
      version:
        CURRENT_SAVE_VERSION >= 7 ? 6 : CURRENT_SAVE_VERSION >= 6 ? 5 : 6,
    } as GameState;
    const original = structuredClone(retained);
    const transform = vi.fn((state: GameState) => buildRecipe(state, "totem"));
    expect(isCurrentReleaseState(retained)).toBe(false);
    expect(() => applyCurrentReleaseAction(retained, transform)).toThrow(
      "actualisation",
    );
    expect(transform).not.toHaveBeenCalled();
    expect(retained).toEqual(original);
  });

  it("autorise une action de la version active, sans perdre l’état de session", () => {
    const state = { ...createGame(), coins: 283 };
    const next = applyCurrentReleaseAction(state, (current) => ({
      ...current,
      coins: current.coins + 17,
    }));
    expect(isCurrentReleaseState(next)).toBe(true);
    expect(next.coins).toBe(300);
    expect(state.coins).toBe(283);
    expect(next.boxes).toEqual(state.boxes);
  });

  it("refuse aussi une transformation qui retournerait accidentellement une ancienne version", () => {
    const state = createGame();
    expect(() =>
      applyCurrentReleaseAction(state, (current) => ({
        ...current,
        version:
          CURRENT_SAVE_VERSION >= 7 ? 6 : CURRENT_SAVE_VERSION >= 6 ? 5 : 6,
      })),
    ).toThrow("version de partie incompatible");
    expect(isCurrentReleaseState(state)).toBe(true);
  });

  it("charge et persiste la migration avant d’autoriser une construction sur les plans revus", async () => {
    if (CURRENT_SAVE_VERSION < 6) return;
    globalThis.indexedDB = new IDBFactory();
    const repository = await connectRepository();
    const database = await openDB("brigo-club", 1);
    const previous = RECIPE_BY_ID.get("totem")!;
    const revised = structuredClone(previous);
    revised.placements[0].x += 1;
    RECIPE_BY_ID.set("totem", revised);
    const retained: GameState = {
      ...createGame(),
      version: 5,
      discovered: ["brick-2x2:mint"],
      constructions: [
        {
          id: "retained-v5-totem",
          recipeId: "totem",
          createdAt: "2026-10-09T09:10:00.000Z",
          pieces: { "brick-2x2:mint": 5 },
        },
      ],
    };
    try {
      await database.put("saves", { revision: 10, state: retained }, "player");
      const transform = vi.fn((state: GameState) =>
        buildRecipe(state, "totem"),
      );
      expect(() => applyCurrentReleaseAction(retained, transform)).toThrow(
        "actualisation",
      );
      expect(transform).not.toHaveBeenCalled();
      const loaded = await repository.load();
      expect(loaded.revision).toBe(11);
      expect(loaded.migration?.returnedPieces).toBe(5);
      expect(loaded.state.inventory).toEqual({ "brick-2x2:mint": 5 });
      expect(loaded.state.constructions).toEqual([]);
      expect((await database.get("saves", "player")).state).toEqual(
        loaded.state,
      );
      const built = applyCurrentReleaseAction(loaded.state, transform);
      expect(transform).toHaveBeenCalledTimes(1);
      expect(built.constructions).toHaveLength(1);
      expect(built.inventory).toEqual({});
      expect(built.constructions[0].pieces).toEqual(
        retained.constructions[0].pieces,
      );
      await repository.commit(built, loaded.revision);
      const reloaded = await repository.load();
      expect(reloaded.migration).toBeUndefined();
      expect(reloaded.state).toEqual(built);
    } finally {
      RECIPE_BY_ID.set("totem", previous);
      repository.close();
      database.close();
    }
  });
});
