import { describe, expect, it } from "vitest";
import { BOXES } from "./catalog";
import {
  adminCommand,
  buildRecipe,
  createGame,
  dismantle,
  finishOpening,
  MAX_VALUE,
  openBox,
} from "./engine";
import type { GameState } from "./engine";
import { getDailyPuzzle } from "./dailyPuzzle";
import { claimVisitReward, visitRewardStatus } from "./progression";
import {
  DAILY_COIN_BUDGET,
  claimDailyMission,
  claimDailyPuzzle,
  claimPassportReward,
  getEngagement,
  initialEngagement,
  syncEngagement,
  utcDayKey,
} from "./engagement";

const NOW = Date.parse("2026-10-15T12:00:00.000Z");
const DAY = 86_400_000;
const visit = (state: GameState, now = NOW) =>
  syncEngagement(claimVisitReward(state, now), state, now);
const solve = (state: GameState, now = NOW) =>
  claimDailyPuzzle(
    state,
    getDailyPuzzle(utcDayKey(now)).solutionRotations,
    now,
  );
const open = (state: GameState, now = NOW) => {
  const next = openBox(state, "discovery", { random: () => 0 });
  const opening = {
    ...next.pendingOpening!,
    createdAt: new Date(now).toISOString(),
  };
  return syncEngagement(
    {
      ...next,
      pendingOpening: opening,
      history: [opening, ...next.history.slice(1)],
    },
    state,
    now,
  );
};

describe("carnet quotidien F2P", () => {
  it("ne donne rien automatiquement au simple affichage", () => {
    const state = createGame();
    const snapshot = structuredClone(state);
    const status = getEngagement(state, NOW);
    expect(status.dayKey).toBe("2026-10-15");
    expect(status.nextResetAt).toBe(Date.parse("2026-10-16T00:00:00.000Z"));
    expect(status.missions.every((item) => !item.canClaim)).toBe(true);
    expect(status.passport).toMatchObject({ visits: 0, target: 7, cycles: 0 });
    expect(state).toEqual(snapshot);
  });

  it("permet une journée complète en partant de zéro pièce et zéro boîte", () => {
    let state: GameState = {
      ...createGame(),
      coins: 0,
      boxes: { discovery: 0, workshop: 0, prism: 0 },
    };
    state = visit(state);
    expect(state.coins).toBe(100);
    state = claimDailyMission(state, "visit", NOW);
    state = solve(state);
    state = claimDailyMission(state, "puzzle", NOW);
    state = finishOpening(open(state));
    state = finishOpening(open(state));
    state = claimDailyMission(state, "open-boxes", NOW);
    state = claimDailyMission(state, "day-complete", NOW);
    expect(DAILY_COIN_BUDGET).toBe(550);
    expect(state.coins).toBe(DAILY_COIN_BUDGET - BOXES.discovery.cost);
    expect(state.boxesOpened).toBe(2);
    expect(state.boxes.discovery).toBe(0);
    expect(
      getEngagement(state, NOW).missions.every(
        (item) => item.claimed && !item.canClaim,
      ),
    ).toBe(true);
  });

  it("refuse les missions inconnues, incomplètes et les doublons", () => {
    const state = createGame();
    expect(() => claimDailyMission(state, "__proto__", NOW)).toThrow(
      "n’existe pas",
    );
    expect(() => claimDailyMission(state, "open-boxes", NOW)).toThrow(
      "Terminez",
    );
    expect(() => claimDailyMission(state, "day-complete", NOW)).toThrow(
      "Terminez",
    );
    const claimed = claimDailyMission(visit(state), "visit", NOW);
    expect(() => claimDailyMission(claimed, "visit", NOW)).toThrow("déjà");
    expect(
      getEngagement(claimed, NOW).missions.find(
        (item) => item.id === "day-complete",
      )?.current,
    ).toBe(1);
  });

  it("vérifie à nouveau le circuit et paie une seule fois par jour", () => {
    const state = createGame();
    const puzzle = getDailyPuzzle("2026-10-15");
    expect(() => claimDailyPuzzle(state, puzzle.initialRotations, NOW)).toThrow(
      "entièrement relié",
    );
    const claimed = solve(state);
    expect(claimed.coins).toBe(state.coins + 150);
    expect(() => solve(claimed)).toThrow("déjà");
    expect(
      getEngagement(claimed, NOW).missions.find((item) => item.id === "puzzle"),
    ).toMatchObject({ completed: true, claimed: false, canClaim: true });
    expect(getEngagement(claimed, NOW + DAY).puzzle.completed).toBe(false);
    expect(solve(claimed, NOW + DAY).coins).toBe(claimed.coins + 150);
  });

  it.each([
    [],
    Array(16).fill(-1),
    Array(16).fill(4),
    Array(16).fill(0.5),
    Array(16).fill(NaN),
  ])("refuse une solution incorrecte sans rémunérer", (rotations) => {
    const state = createGame();
    expect(() => claimDailyPuzzle(state, rotations, NOW)).toThrow();
    expect(state.coins).toBe(1200);
    expect(state.engagement?.puzzleClaimed).toBe(false);
  });

  it("limite les ouvertures à deux et ignore les cartes admin forcées", () => {
    let state = createGame();
    for (let index = 0; index < 3; index++) state = finishOpening(open(state));
    expect(state.engagement?.openings).toBe(2);
    const initial = createGame();
    const debug = openBox(initial, "discovery", {
      forcedRarity: "legendary",
      adminEnabled: true,
      random: () => 0,
    });
    expect(syncEngagement(debug, initial, NOW).engagement?.openings).toBe(0);
    expect(syncEngagement(state, state, NOW).engagement?.openings).toBe(2);
  });

  it("ne crée aucune monnaie par une boucle montage / démontage", () => {
    const supplied = adminCommand(
      createGame(),
      { type: "recipe", recipeId: "totem" },
      true,
    );
    const built = syncEngagement(buildRecipe(supplied, "totem"), supplied, NOW);
    const removed = syncEngagement(
      dismantle(built, built.constructions[0].id),
      built,
      NOW,
    );
    const rebuilt = syncEngagement(buildRecipe(removed, "totem"), removed, NOW);
    expect(rebuilt.coins).toBe(supplied.coins);
    expect(
      getEngagement(rebuilt, NOW).missions.every((item) => !item.canClaim),
    ).toBe(true);
  });

  it("ne transforme pas des ouvertures importées en missions du jour", () => {
    const initial = createGame();
    const old = open(initial, NOW - DAY * 30);
    const legacyJournal = {
      ...initialEngagement(null, NOW),
      dayKey: utcDayKey(NOW),
    };
    for (const imported of [
      { ...finishOpening(old), engagement: legacyJournal },
      { ...old, engagement: legacyJournal },
      { ...old, boxesOpened: 20, engagement: legacyJournal },
    ])
      expect(syncEngagement(imported, initial, NOW).engagement?.openings).toBe(
        0,
      );
  });

  it("renouvelle à minuit UTC et ne cumule pas les journées manquées", () => {
    const late = Date.parse("2026-10-15T23:59:59.999Z");
    const tomorrow = late + 1;
    const today = claimDailyMission(visit(createGame(), late), "visit", late);
    expect(getEngagement(today, late).missions[0].claimed).toBe(true);
    expect(getEngagement(today, tomorrow).missions[0]).toMatchObject({
      completed: false,
      claimed: false,
    });
    const returned = visit(today, tomorrow + DAY * 10);
    expect(returned.engagement?.passport.visits).toBe(2);
    expect(returned.coins).toBe(today.coins + 100);
    expect(returned.engagement?.claimedMissions).toEqual([]);
  });

  it("bloque les gains si l’horloge revient avant une journée déjà jouée", () => {
    const future = solve(visit(createGame(), NOW + DAY), NOW + DAY);
    const snapshot = structuredClone(future);
    const status = getEngagement(future, NOW);
    expect(status.clockAdjusted).toBe(true);
    expect(status.missions.every((item) => !item.canClaim)).toBe(true);
    expect(() => claimDailyMission(future, "visit", NOW)).toThrow("horloge");
    expect(() => solve(future, NOW)).toThrow("horloge");
    expect(() => claimPassportReward(future, NOW)).toThrow("horloge");
    expect(visitRewardStatus(future, NOW).clockAdjusted).toBe(true);
    expect(syncEngagement(future, future, NOW)).toBe(future);
    expect(future).toEqual(snapshot);
  });

  it.each([NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER])(
    "rejette les horloges invalides %s",
    (now) => {
      expect(() => getEngagement(createGame(), now)).toThrow("heure");
      expect(() => claimDailyMission(createGame(), "visit", now)).toThrow(
        "heure",
      );
    },
  );

  it("garde une récompense disponible après un refus pour dépassement", () => {
    const state = { ...visit(createGame()), coins: MAX_VALUE - 49 };
    const before = structuredClone(state);
    expect(() => claimDailyMission(state, "visit", NOW)).toThrow("réserve");
    expect(state).toEqual(before);
    expect(getEngagement(state, NOW).missions[0].canClaim).toBe(true);
    const puzzle = { ...createGame(), coins: MAX_VALUE - 149 };
    expect(() => solve(puzzle)).toThrow("réserve");
    expect(puzzle.engagement?.puzzleClaimed).toBe(false);
    expect(solve({ ...puzzle, coins: MAX_VALUE - 150 }).coins).toBe(MAX_VALUE);
  });
});

describe("passeport de sept visites sans série obligatoire", () => {
  it("conserve les tampons des jours non consécutifs et récompense explicitement", () => {
    let state = createGame();
    for (let index = 0; index < 7; index++)
      state = visit(state, NOW + DAY * index * 3);
    const now = NOW + DAY * 18;
    expect(getEngagement(state, now).passport).toMatchObject({
      visits: 7,
      cycles: 0,
      canClaim: true,
    });
    expect(state.boxes.prism).toBe(0);
    const claimed = claimPassportReward(state, now);
    expect(claimed.coins).toBe(state.coins + 300);
    expect(claimed.boxes.prism).toBe(1);
    expect(claimed.engagement?.passport).toMatchObject({
      visits: 0,
      cycles: 1,
      lastVisitDay: utcDayKey(now),
    });
    expect(() => claimPassportReward(claimed, now)).toThrow("sept visites");
    expect(
      syncEngagement(claimed, claimed, now).engagement?.passport.visits,
    ).toBe(0);
    expect(visit(claimed, now + DAY).engagement?.passport.visits).toBe(1);
  });

  it("ne compte pas plusieurs tampons en affichant ou réconciliant le même cadeau", () => {
    const state = visit(createGame());
    const snapshot = structuredClone(state);
    expect(getEngagement(state, NOW).passport.visits).toBe(1);
    expect(
      syncEngagement(state, createGame(), NOW).engagement?.passport.visits,
    ).toBe(1);
    expect(state).toEqual(snapshot);
    expect(
      initialEngagement(new Date(NOW).toISOString(), NOW).passport.visits,
    ).toBe(1);
    expect(
      initialEngagement(new Date(NOW - DAY).toISOString(), NOW).passport.visits,
    ).toBe(0);
  });

  it("ne consomme aucun tampon si une réserve est pleine", () => {
    const ready = {
      ...createGame(),
      engagement: {
        ...initialEngagement(null, NOW),
        dayKey: utcDayKey(NOW),
        passport: { visits: 7, cycles: 0, lastVisitDay: utcDayKey(NOW) },
      },
    };
    for (const state of [
      { ...ready, coins: MAX_VALUE - 299 },
      { ...ready, boxes: { ...ready.boxes, prism: MAX_VALUE } },
    ]) {
      const snapshot = structuredClone(state);
      expect(() => claimPassportReward(state, NOW)).toThrow("réserve");
      expect(state).toEqual(snapshot);
      expect(getEngagement(state, NOW).passport.canClaim).toBe(true);
    }
  });
});
