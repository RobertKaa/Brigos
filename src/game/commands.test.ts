import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "./catalog";
import {
  applyGameCommand,
  CommandValidationError,
  parseGameCommand,
} from "./commands";
import { getDailyPuzzle } from "./dailyPuzzle";
import { adminCommand, buildRecipe, createGame } from "./engine";
import { DAILY_MISSION_IDS } from "./engagement";
import { ACHIEVEMENT_IDS } from "./progression";
import { RECYCLE_VALUES } from "./recycling";

const NOW = Date.parse("2026-10-16T12:00:00.000Z");
const BRIGO = CATALOG[0].id;
const OTHER = CATALOG[1].id;
afterEach(() => vi.useRealTimers());

describe("frontière des commandes publiques", () => {
  it.each([
    { type: "open-box", boxId: "discovery" },
    { type: "open-next-box", boxId: "prism" },
    { type: "finish-opening" },
    { type: "follow-recipe", recipeId: null },
    { type: "follow-recipe", recipeId: "totem" },
    { type: "build-recipe", recipeId: "totem" },
    { type: "dismantle", constructionId: "built-1" },
    { type: "order-parts", recipeId: "totem" },
    { type: "recycle", brigoId: BRIGO, quantity: 1 },
    { type: "claim-visit" },
    { type: "claim-achievement", achievementId: ACHIEVEMENT_IDS[0] },
    { type: "claim-daily-mission", missionId: DAILY_MISSION_IDS[0] },
    { type: "claim-daily-puzzle", solution: Array(16).fill(0) },
    { type: "claim-passport" },
    { type: "claim-all-daily" },
    { type: "collect-production" },
    { type: "collect-production", recipeId: "totem" },
    { type: "create-project" },
    { type: "create-project", name: "Jardin" },
    { type: "rename-project", projectId: "project-1", name: "Jardin" },
    { type: "delete-project", projectId: "project-1" },
    {
      type: "place-brigo",
      projectId: "project-1",
      candidate: { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 90 },
    },
    {
      type: "move-brigo",
      projectId: "project-1",
      placementId: "part-1",
      candidate: { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 180 },
    },
    { type: "remove-brigo", projectId: "project-1", placementId: "part-1" },
    { type: "preferences", sound: true, reducedMotion: false },
  ])(
    "accepte toutes les familles utilisées par l’interface : %j",
    (command) => {
      expect(parseGameCommand(command)).toEqual(command);
    },
  );

  it.each([
    null,
    [],
    "open-box",
    {},
    { type: "admin", coins: 9999 },
    { type: "open-box", boxId: "discovery", forcedRarity: "legendary" },
    { type: "open-box", boxId: "discovery", adminEnabled: true },
    { type: "claim-visit", nowMs: NOW + 86_400_000 },
    { type: "preferences", coins: 9999 },
    { type: "preferences" },
    { type: "preferences", sound: "true" },
    { type: "open-box", boxId: "unknown" },
    { type: "build-recipe", recipeId: "unknown" },
    { type: "claim-achievement", achievementId: "unknown" },
    { type: "claim-daily-mission", missionId: "unknown" },
    { type: "recycle", brigoId: BRIGO, quantity: -1 },
    { type: "recycle", brigoId: BRIGO, quantity: 1.5 },
    { type: "recycle", brigoId: BRIGO, quantity: 100001 },
    { type: "claim-daily-puzzle", solution: Array(16).fill(4) },
    { type: "claim-daily-puzzle", solution: Array(16) },
    { type: "claim-daily-puzzle", solution: [0] },
    { type: "collect-production", recipeId: undefined },
    {
      type: "place-brigo",
      projectId: "project",
      candidate: { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 45 },
    },
    {
      type: "place-brigo",
      projectId: "project",
      candidate: { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 0, quantity: 5 },
    },
  ])("rejette les entrées invalides et les champs de triche : %j", (value) => {
    expect(() => parseGameCommand(value)).toThrow(CommandValidationError);
  });

  it("reconstruit une commande bornée sans accepter un état client", () => {
    expect(parseGameCommand({ type: "preferences", sound: false })).toEqual({
      type: "preferences",
      sound: false,
    });
    expect(
      parseGameCommand({ type: "create-project", name: "  Mon jardin  " }),
    ).toEqual({ type: "create-project", name: "Mon jardin" });
    expect(() =>
      parseGameCommand({
        type: "preferences",
        sound: false,
        state: createGame(),
      }),
    ).toThrow(CommandValidationError);
    expect(() =>
      parseGameCommand(
        JSON.parse('{"type":"claim-visit","__proto__":{"admin":true}}'),
      ),
    ).toThrow(CommandValidationError);
  });
});

describe("exécution autoritaire des commandes", () => {
  it("utilise l’heure reçue du serveur pour les tirages et le carnet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW + 100 * 86_400_000);
    const before = createGame();
    const after = applyGameCommand(
      before,
      { type: "open-box", boxId: "discovery" },
      NOW,
    ).state;
    expect(after.pendingOpening?.createdAt).toBe(new Date(NOW).toISOString());
    expect(after.engagement?.openings).toBe(1);
    expect(before.boxes.discovery).toBe(3);
    expect(after.boxes.discovery).toBe(2);
  });

  it("refuse une ouverture sans monnaie ni boîte sans modifier le stock", () => {
    const state = {
      ...createGame(),
      coins: 0,
      boxes: { discovery: 0, workshop: 0, prism: 0 },
    };
    expect(() =>
      applyGameCommand(state, { type: "open-box", boxId: "discovery" }, NOW),
    ).toThrow("manque");
    expect(state.inventory).toEqual({});
    expect(state.history).toEqual([]);
  });

  it("ne permet pas de réutiliser une récompense quotidienne", () => {
    const before = createGame();
    const after = applyGameCommand(before, { type: "claim-visit" }, NOW).state;
    expect(after.coins).toBe(before.coins + 100);
    expect(() =>
      applyGameCommand(after, { type: "claim-visit" }, NOW),
    ).toThrow();
    expect(after.coins).toBe(before.coins + 100);
  });

  it("valide la solution du puzzle et ne crédite qu’une fois", () => {
    const before = createGame();
    expect(() =>
      applyGameCommand(
        before,
        { type: "claim-daily-puzzle", solution: Array(16).fill(0) },
        NOW,
      ),
    ).toThrow();
    const solution = [...getDailyPuzzle("2026-10-16").solutionRotations];
    const after = applyGameCommand(
      before,
      { type: "claim-daily-puzzle", solution },
      NOW,
    ).state;
    expect(after.coins).toBe(before.coins + 150);
    expect(() =>
      applyGameCommand(after, { type: "claim-daily-puzzle", solution }, NOW),
    ).toThrow("déjà");
  });

  it("retourne l’identifiant créé puis réserve et restitue la référence exacte", () => {
    const before = { ...createGame(), inventory: { [BRIGO]: 1 } };
    const created = applyGameCommand(
      before,
      { type: "create-project", name: "Mon jardin" },
      NOW,
    );
    const projectId = created.result.projectId as string;
    expect(created.state.sandboxProjects?.[0]).toMatchObject({
      id: projectId,
      createdAt: new Date(NOW).toISOString(),
    });
    const placed = applyGameCommand(
      created.state,
      {
        type: "place-brigo",
        projectId,
        candidate: { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 0 },
      },
      NOW + 1,
    ).state;
    expect(placed.inventory[BRIGO]).toBeUndefined();
    const placement = placed.sandboxProjects![0].placements[0];
    expect(() =>
      applyGameCommand(
        placed,
        {
          type: "move-brigo",
          projectId,
          placementId: placement.id,
          candidate: {
            brigoId: OTHER,
            x: placement.x,
            y: placement.y,
            z: placement.z,
            rotation: placement.rotation,
          },
        },
        NOW + 2,
      ),
    ).toThrow("conserver");
    const removed = applyGameCommand(
      placed,
      { type: "remove-brigo", projectId, placementId: placement.id },
      NOW + 2,
    ).state;
    expect(removed.inventory).toEqual(before.inventory);
    expect(removed.sandboxProjects![0].placements).toEqual([]);
    expect(removed.sandboxProjects![0].updatedAt).toBe(
      new Date(NOW + 2).toISOString(),
    );
  });

  it("refuse de placer ou recycler des Brigos absents", () => {
    const created = applyGameCommand(
      createGame(),
      { type: "create-project" },
      NOW,
    );
    expect(() =>
      applyGameCommand(
        created.state,
        {
          type: "place-brigo",
          projectId: created.result.projectId as string,
          candidate: { brigoId: BRIGO, x: 0, y: 0, z: 0, rotation: 0 },
        },
        NOW,
      ),
    ).toThrow("disponible");
    expect(() =>
      applyGameCommand(
        created.state,
        { type: "recycle", brigoId: BRIGO, quantity: 1 },
        NOW,
      ),
    ).toThrow();
    expect(created.state.inventory).toEqual({});
  });

  it("recycle une référence réelle contenant deux-points en conservant le dernier exemplaire", () => {
    const before = { ...createGame(), inventory: { [BRIGO]: 2 } };
    const after = applyGameCommand(
      before,
      { type: "recycle", brigoId: BRIGO, quantity: 1 },
      NOW,
    ).state;
    expect(after.inventory[BRIGO]).toBe(1);
    expect(after.coins).toBe(before.coins + RECYCLE_VALUES[CATALOG[0].rarity]);
    expect(() =>
      applyGameCommand(
        after,
        { type: "recycle", brigoId: BRIGO, quantity: 1 },
        NOW,
      ),
    ).toThrow();
  });

  it("retourne le gain réellement récolté et conserve les marqueurs anti-double crédit", () => {
    const supplied = adminCommand(
      createGame(),
      { type: "recipe", recipeId: "totem" },
      true,
    );
    const built = buildRecipe(supplied, "totem", NOW - 3_600_000);
    const first = applyGameCommand(
      built,
      { type: "collect-production", recipeId: "totem" },
      NOW,
    );
    expect(first.result.coins).toBe(1);
    expect(first.state.coins).toBe(built.coins + 1);
    const replay = applyGameCommand(
      first.state,
      { type: "collect-production", recipeId: "totem" },
      NOW,
    );
    expect(replay.result.coins).toBe(0);
    expect(replay.state.coins).toBe(first.state.coins);
  });
});
