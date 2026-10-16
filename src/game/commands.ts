import { BOX_IDS, BRIGO_BY_ID, RECIPE_BY_ID } from "./catalog";
import type { BoxId } from "./catalog";
import {
  buildRecipe,
  dismantle,
  finishOpening,
  followRecipe,
  GameError,
  openBox,
  openNextBox,
} from "./engine";
import type { GameState } from "./engine";
import {
  DAILY_MISSION_IDS,
  claimDailyMission,
  claimDailyPuzzle,
  claimPassportReward,
  getEngagement,
  syncEngagement,
} from "./engagement";
import { orderRecipeParts } from "./market";
import {
  collectProduction,
  collectRecipeProduction,
  observeProduction,
} from "./production";
import {
  ACHIEVEMENT_IDS,
  claimAchievement,
  claimVisitReward,
} from "./progression";
import { recycleBrigos } from "./recycling";
import {
  createSandboxProject,
  deleteSandboxProject,
  moveSandboxBrigo,
  placeSandboxBrigo,
  removeSandboxBrigo,
  renameSandboxProject,
  SANDBOX_GRID_SIZE,
  SANDBOX_MAX_HEIGHT,
  SANDBOX_MAX_NAME_LENGTH,
} from "./sandbox";
import type { SandboxCandidate } from "./sandbox";

export type GameCommand =
  | { type: "open-box" | "open-next-box"; boxId: BoxId }
  | {
      type:
        "finish-opening" | "claim-visit" | "claim-passport" | "claim-all-daily";
    }
  | { type: "follow-recipe"; recipeId: string | null }
  | { type: "build-recipe" | "order-parts"; recipeId: string }
  | { type: "dismantle"; constructionId: string }
  | { type: "recycle"; brigoId: string; quantity: number }
  | { type: "claim-achievement"; achievementId: string }
  | { type: "claim-daily-mission"; missionId: string }
  | { type: "claim-daily-puzzle"; solution: number[] }
  | { type: "collect-production"; recipeId?: string }
  | { type: "create-project"; name?: string }
  | { type: "rename-project"; projectId: string; name: string }
  | { type: "delete-project"; projectId: string }
  | { type: "place-brigo"; projectId: string; candidate: SandboxCandidate }
  | {
      type: "move-brigo";
      projectId: string;
      placementId: string;
      candidate: SandboxCandidate;
    }
  | { type: "remove-brigo"; projectId: string; placementId: string }
  | { type: "preferences"; sound?: boolean; reducedMotion?: boolean };

export interface Snapshot {
  state: GameState;
  revision: number;
  serverTime: string;
}
export type GameSnapshot = Snapshot;
export interface CommandRequest {
  commandId: string;
  expectedRevision: number;
  command: GameCommand;
}
export interface CommandResponse extends Snapshot {
  result: Record<string, unknown>;
  replayed: boolean;
}
export class CommandValidationError extends Error {}

const fail = (): never => {
  throw new CommandValidationError("Commande invalide.");
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail();
  return value as Record<string, unknown>;
}
function fields(
  value: Record<string, unknown>,
  required: string[],
  optional: string[] = [],
) {
  if (
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
  )
    fail();
}
function identifier(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.length ||
    value.length > 128 ||
    !/^[a-zA-Z0-9_:-]+$/.test(value)
  )
    return fail();
  return value;
}
function recipe(value: unknown): string {
  const id = identifier(value);
  if (!RECIPE_BY_ID.has(id)) return fail();
  return id;
}
function brigo(value: unknown): string {
  const id = identifier(value);
  if (!BRIGO_BY_ID.has(id)) return fail();
  return id;
}
function integer(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    return fail();
  return value;
}
function projectName(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > SANDBOX_MAX_NAME_LENGTH ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value)
  )
    return fail();
  return value.trim();
}
function candidate(value: unknown): SandboxCandidate {
  const data = record(value);
  fields(data, ["brigoId", "x", "y", "z", "rotation"]);
  const rotation = integer(data.rotation, 0, 270);
  if (rotation % 90) return fail();
  return {
    brigoId: brigo(data.brigoId),
    x: integer(data.x, 0, SANDBOX_GRID_SIZE - 1),
    y: integer(data.y, 0, SANDBOX_GRID_SIZE - 1),
    z: integer(data.z, 0, SANDBOX_MAX_HEIGHT - 1),
    rotation: rotation as SandboxCandidate["rotation"],
  };
}

/** Strict public command boundary: client snapshots, rewards, clocks and admin flags are never accepted. */
export function parseGameCommand(value: unknown): GameCommand {
  const data = record(value);
  const type = data.type;
  if (typeof type !== "string") return fail();
  switch (type) {
    case "open-box":
    case "open-next-box":
      fields(data, ["type", "boxId"]);
      if (!BOX_IDS.includes(data.boxId as BoxId)) return fail();
      return { type, boxId: data.boxId as BoxId };
    case "finish-opening":
    case "claim-visit":
    case "claim-passport":
    case "claim-all-daily":
      fields(data, ["type"]);
      return { type };
    case "follow-recipe":
      fields(data, ["type", "recipeId"]);
      return {
        type,
        recipeId: data.recipeId === null ? null : recipe(data.recipeId),
      };
    case "build-recipe":
    case "order-parts":
      fields(data, ["type", "recipeId"]);
      return { type, recipeId: recipe(data.recipeId) };
    case "dismantle":
      fields(data, ["type", "constructionId"]);
      return { type, constructionId: identifier(data.constructionId) };
    case "recycle":
      fields(data, ["type", "brigoId", "quantity"]);
      return {
        type,
        brigoId: brigo(data.brigoId),
        quantity: integer(data.quantity, 1, 100_000),
      };
    case "claim-achievement":
      fields(data, ["type", "achievementId"]);
      if (
        !ACHIEVEMENT_IDS.includes(
          data.achievementId as (typeof ACHIEVEMENT_IDS)[number],
        )
      )
        return fail();
      return { type, achievementId: data.achievementId as string };
    case "claim-daily-mission":
      fields(data, ["type", "missionId"]);
      if (
        !DAILY_MISSION_IDS.includes(
          data.missionId as (typeof DAILY_MISSION_IDS)[number],
        )
      )
        return fail();
      return { type, missionId: data.missionId as string };
    case "claim-daily-puzzle":
      fields(data, ["type", "solution"]);
      if (!Array.isArray(data.solution) || data.solution.length !== 16)
        return fail();
      return {
        type,
        solution: Array.from(data.solution, (item) => integer(item, 0, 3)),
      };
    case "collect-production":
      fields(data, ["type"], ["recipeId"]);
      return Object.hasOwn(data, "recipeId")
        ? { type, recipeId: recipe(data.recipeId) }
        : { type };
    case "create-project":
      fields(data, ["type"], ["name"]);
      return Object.hasOwn(data, "name")
        ? { type, name: projectName(data.name) }
        : { type };
    case "rename-project":
      fields(data, ["type", "projectId", "name"]);
      return {
        type,
        projectId: identifier(data.projectId),
        name: projectName(data.name),
      };
    case "delete-project":
      fields(data, ["type", "projectId"]);
      return { type, projectId: identifier(data.projectId) };
    case "place-brigo":
      fields(data, ["type", "projectId", "candidate"]);
      return {
        type,
        projectId: identifier(data.projectId),
        candidate: candidate(data.candidate),
      };
    case "move-brigo":
      fields(data, ["type", "projectId", "placementId", "candidate"]);
      return {
        type,
        projectId: identifier(data.projectId),
        placementId: identifier(data.placementId),
        candidate: candidate(data.candidate),
      };
    case "remove-brigo":
      fields(data, ["type", "projectId", "placementId"]);
      return {
        type,
        projectId: identifier(data.projectId),
        placementId: identifier(data.placementId),
      };
    case "preferences": {
      fields(data, ["type"], ["sound", "reducedMotion"]);
      if (!["sound", "reducedMotion"].some((key) => Object.hasOwn(data, key)))
        return fail();
      const parsed: Extract<GameCommand, { type: "preferences" }> = { type };
      for (const key of ["sound", "reducedMotion"] as const)
        if (Object.hasOwn(data, key)) {
          if (typeof data[key] !== "boolean") return fail();
          parsed[key] = data[key];
        }
      return parsed;
    }
    default:
      return fail();
  }
}

/** Compose the existing claims in order; the day-complete reward is evaluated last. */
export function claimAvailableDailyMissions(
  state: GameState,
  nowMs = Date.now(),
): GameState {
  let next = state;
  for (const mission of getEngagement(state, nowMs).missions) {
    if (
      getEngagement(next, nowMs).missions.find(
        (item) => item.id === mission.id,
      )!.canClaim
    )
      next = claimDailyMission(next, mission.id, nowMs);
  }
  if (next === state)
    throw new GameError(
      "Aucune récompense de mission n’est prête à récupérer.",
    );
  return next;
}

export function applyGameCommand(
  state: GameState,
  command: GameCommand,
  nowMs: number,
): { state: GameState; result: Record<string, unknown> } {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new GameError("Heure de jeu invalide.");
  // Recheck even typed callers so no untrusted command can bypass this boundary.
  const parsed = parseGameCommand(command);
  let next: GameState;
  let result: Record<string, unknown> = {};
  switch (parsed.type) {
    case "open-box":
      next = openBox(state, parsed.boxId, { nowMs });
      break;
    case "open-next-box":
      next = openNextBox(state, parsed.boxId, { nowMs });
      break;
    case "finish-opening":
      next = finishOpening(state);
      break;
    case "follow-recipe":
      next = followRecipe(state, parsed.recipeId);
      break;
    case "build-recipe":
      next = buildRecipe(state, parsed.recipeId, nowMs);
      break;
    case "dismantle":
      next = dismantle(state, parsed.constructionId, nowMs);
      break;
    case "order-parts":
      next = orderRecipeParts(state, parsed.recipeId);
      break;
    case "recycle":
      next = recycleBrigos(state, parsed.brigoId, parsed.quantity);
      break;
    case "claim-visit":
      next = claimVisitReward(state, nowMs);
      break;
    case "claim-achievement":
      next = claimAchievement(state, parsed.achievementId);
      break;
    case "claim-daily-mission":
      next = claimDailyMission(state, parsed.missionId, nowMs);
      break;
    case "claim-daily-puzzle":
      next = claimDailyPuzzle(state, parsed.solution, nowMs);
      break;
    case "claim-passport":
      next = claimPassportReward(state, nowMs);
      break;
    case "claim-all-daily":
      next = claimAvailableDailyMissions(state, nowMs);
      break;
    case "collect-production":
      next = parsed.recipeId
        ? collectRecipeProduction(state, parsed.recipeId, nowMs)
        : collectProduction(state, undefined, nowMs);
      result = { coins: next.coins - state.coins };
      break;
    case "create-project":
      next = createSandboxProject(state, parsed.name, nowMs);
      result = { projectId: next.sandboxProjects!.at(-1)!.id };
      break;
    case "rename-project":
      next = renameSandboxProject(state, parsed.projectId, parsed.name, nowMs);
      break;
    case "delete-project":
      next = deleteSandboxProject(state, parsed.projectId);
      break;
    case "place-brigo":
      next = placeSandboxBrigo(
        state,
        parsed.projectId,
        parsed.candidate,
        nowMs,
      );
      break;
    case "move-brigo":
      next = moveSandboxBrigo(
        state,
        parsed.projectId,
        parsed.placementId,
        parsed.candidate,
        nowMs,
      );
      break;
    case "remove-brigo":
      next = removeSandboxBrigo(
        state,
        parsed.projectId,
        parsed.placementId,
        nowMs,
      );
      break;
    case "preferences": {
      const { type: _type, ...preferences } = parsed;
      next = {
        ...state,
        preferences: { ...state.preferences, ...preferences },
      };
      break;
    }
  }
  return {
    state: syncEngagement(observeProduction(next, nowMs), state, nowMs),
    result,
  };
}
