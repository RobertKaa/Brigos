import { describe, expect, it, vi } from "vitest";
import { adminCommand, buildRecipe, createGame } from "./engine";
import { claimDailyMission, getEngagement, syncEngagement } from "./engagement";
import { claimVisitReward } from "./progression";
import { importSave, parseSave, parseSaveResult } from "./save";
import { CURRENT_SAVE_VERSION } from "./releaseVersion";

const NOW = Date.parse("2026-10-15T12:00:00.000Z");
const claimedVisit = () => {
  const state = createGame();
  return claimDailyMission(
    syncEngagement(claimVisitReward(state, NOW), state, NOW),
    "visit",
    NOW,
  );
};

describe("persistance du carnet quotidien", () => {
  it("sauvegarde les missions, tampons et garde les récompenses idempotentes", () => {
    const state = claimedVisit();
    const restored = importSave(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(() => claimDailyMission(restored, "visit", NOW)).toThrow("déjà");
    expect(getEngagement(restored, NOW).passport.visits).toBe(1);
  });

  it("ouvre les anciennes sauvegardes sans changer leurs valeurs ni plans", () => {
    const original = createGame();
    const {
      engagement: _oldField,
      production: _futureProduction,
      ...legacy
    } = original;
    const restored = parseSave({ ...legacy, version: 6 });
    expect(restored).toEqual({
      ...original,
      production: { observedAt: expect.any(Number), entries: {} },
    });
    expect(restored.version).toBe(original.version);
    expect(restored.planRevision).toBe(original.planRevision);
  });

  it("reconnaît un cadeau déjà réclamé aujourd’hui sans redonner sa monnaie", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    try {
      const state = claimVisitReward(createGame(), NOW);
      const {
        engagement: _oldField,
        production: _futureProduction,
        ...legacy
      } = state;
      const restored = parseSave({ ...legacy, version: 6 });
      expect(restored.coins).toBe(state.coins);
      expect(restored.boxes).toEqual(state.boxes);
      expect(getEngagement(restored, NOW).missions[0]).toMatchObject({
        completed: true,
        claimed: false,
      });
      expect(getEngagement(restored, NOW).passport.visits).toBe(1);
      expect(
        syncEngagement(restored, state, NOW).engagement?.passport.visits,
      ).toBe(1);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("refuse un format v7 privé de son carnet pour éviter de réinitialiser les gains", () => {
    const { engagement: _oldField, ...stripped } = claimedVisit();
    expect(() => parseSave(stripped)).toThrow("carnet quotidien manquant");
  });

  it("migre v6 vers v7 sans modifier ni démonter une construction publiée", () => {
    const built = buildRecipe(
      adminCommand(createGame(), { type: "recipe", recipeId: "totem" }, true),
      "totem",
    );
    const {
      engagement: _oldField,
      production: _futureProduction,
      ...oldSave
    } = built;
    const source = { ...oldSave, version: 6 };
    const result = parseSaveResult(source);
    expect(result.state.version).toBe(CURRENT_SAVE_VERSION);
    expect(result.migration).toBeUndefined();
    expect(result.state.constructions).toEqual(source.constructions);
    expect(result.state.inventory).toEqual(source.inventory);
    expect(result.state.coins).toBe(source.coins);
    expect(result.state.boxes).toEqual(source.boxes);
  });

  it("empêche un client limité au format v6 de réécrire une sauvegarde v7", async () => {
    const state = claimedVisit();
    vi.resetModules();
    vi.doMock("./releaseVersion", () => ({ CURRENT_SAVE_VERSION: 6 }));
    try {
      const oldReader = await import("./save");
      expect(() => oldReader.parseSave(state)).toThrow("version plus récente");
    } finally {
      vi.doUnmock("./releaseVersion");
      vi.resetModules();
    }
  });

  it.each([
    null,
    { dayKey: "2026-02-30" },
    { dayKey: "2026-99-99" },
    { dayKey: "999999999-01-01" },
    { openings: 3 },
    { openings: -1 },
    { openings: 0.5 },
    { openings: 2 },
    { visit: "true" },
    { puzzleClaimed: 1 },
    { claimedMissions: ["__proto__"] },
    { claimedMissions: ["visit", "visit"] },
    { claimedMissions: ["open-boxes"] },
    { claimedMissions: ["puzzle"] },
    { claimedMissions: ["visit", "day-complete"] },
    { passport: { visits: 8, cycles: 0, lastVisitDay: "2026-10-15" } },
    { passport: { visits: 1, cycles: 0, lastVisitDay: null } },
    { passport: { visits: 0, cycles: 1, lastVisitDay: null } },
    { passport: { visits: 1, cycles: 0, lastVisitDay: "2026-10-16" } },
    { passport: { visits: 1, cycles: -1, lastVisitDay: "2026-10-15" } },
    { passport: { visits: 1, cycles: 10_000_001, lastVisitDay: "2026-10-15" } },
  ])("rejette un carnet altéré %j", (alteration) => {
    const state = claimedVisit();
    const engagement =
      alteration === null ? null : { ...state.engagement, ...alteration };
    expect(() => parseSave({ ...state, engagement })).toThrow(
      "carnet quotidien",
    );
  });
});
